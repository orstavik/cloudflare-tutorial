# Pattern: AsyncDecorator?

> All good things come to those who wait. Do you remember that still?

## WhatIs: AsyncDecorator?

An AsyncDecorator is a state machine. The AsyncDecorator is designed to tackle async functions and race conditions.

The AsyncDecorator state machine has two inputs: a **start state** and a **list of actions**. The state machine outputs a **set of end states**. When started, the AsyncDecorator will use the list of actions to (gradually) convert the start state into the set of end states. To get to the set of end states, each action can make a set of intermediate states that in turn is used as input to other actions, which eventually result in an end state which is not used as input in any other action.

## HowDoes: the AsyncDecorator work?

The AsyncDecorator is an acyclic graph where each state represents **both** a point in time and a point in space, and the vectors represent actions that transform one set of states into another set of states. Different actions can **race** to fill a new state, and once written, a state cannot be changed. And each action is not invoked before the required input states are resolved.

**The AsyncDecorator states are data objects:**
* Any state is simply a data object that either already exists or that *might* appear at a point in the future.
* The start state is passed into the state machine and cannot be created/mutated by any action. 
* End states are created by actions, are *not* used as input to any other action, and are passed out of the state machine.
* Intermediate states are created by an action, used as input to another action, and are discarded when the state machine ends.
* The same state can be used as input by several actions.

**The AsyncDecorator is a process** (ie. one function call):
* Each AsyncDecorator action can only be started once per process. This ensures that the AsyncDecorator will run as an acyclic graph, no output from an action can (indirectly) become input for the same action.
* If all outcome states of an action is already populated, then that action will not run.  

> Note: You can reuse the same function in many different actions, by making different action entries in the action list with the same function.

**Each action is a pure-ish function:**
 * Actions are restricted to **reading incoming states**; actions should never write to the incoming states.
 * Actions must wait for all **incoming states** to be filled before they can start.
 * Except when an **incoming state** is made optional.

**Each action can have several potential outcome states, but will at most produce one**:
 * Each action can have zero, one, or **several potential outcome states**.
 * But. Each action can only **produce one outcome**. Thus, if an action has three potential outcome states, when completed this action will fill one of these outcome states and leave the other two potential outcome states untouched. (This would be implemented in javascript as the outcome being three pending promises, where one promise ends up being resolved, while the other two remains pending indefinitely.)
* An action can have optional outcome states. If an action is only missing optional states, it will not start.
   
**The first action to write to an outcome state wins:**
 * Each state can only be written once. Once written, each state is final.
 * Different actions can all try to fulfill the same intermediate or end state.
 * Because each state can only be written once and different actions can potentially write to the same state, therefore the first action to produce an outcome to this state will win. This means that the first action to produce an outcome to a particular state will win, and all other actions that attempt to write to the same state *later* will be blocked.

**External states can be used:**
 * But. Each action can both read and write to external states. Thus, each action is pure only in terms of the state managed by the AsyncDecorator state machine, but not pure in terms of other state sources. 
   * Note. Different actions used in the same state machine should not read/write from the same external state. The only exception of this rule are tightly co-dependent actions (such as write-to-cache-action and read-from-cache-action), which in many ways can be viewed as one operation split into a reverse read-write operation.
	
## HowTo: write an AsyncDecorator?

The AsyncDecorator can be illustrated as an acyclic graph and written as a list of action entries:

Example 1: intermediate state and two input states
```
[['start'], action1, ['m1']],
[['start'], action2, ['m2']],
[['m1', 'm2'], action4, ['end']]
```

Example 2: multiple output states and multiple end states
```
[['start'], action1, ['m1']],
[['m1'], action2, ['m2', 'm3']],
[['m2'], action3, ['end']]
[['m3'], action4, ['observe']]
```

Example 3: optional incoming state
```
[['start'], action1, ['m1']],
[['start'], action2, ['m2']],
[['m1', '*m2'], action4, ['end']]
```

Example 4: Looks cyclic, but is an acyclic race
```
[['start'], action1, ['x']],
[['start'], action2, ['y']],

[['x'], actionX, ['y']],                 
[['y'], actionY, ['x']],

[['x', '*y'], action3, ['end']],
```

In the example above, the following scenarios might occur:
1. `action1` writes `x`; `action2` is delayed and does not yet write to `y`; `actionX` writes `y`; `actionY` does not start because `x` already is written; `action3` writes to `end`; `action2` resumes but is blocked from writing to `x`.
2. `action1` is delayed and do not write to `x`; `action2` writes to `y`; `actionX` awaits income state `x`; `actionY` writes to `x`; `action3` writes to `end`; `action1` and `actionX` resumes and are both blocked from writing to `x` and `y` because they are already written.
3. `action1` writes to `x`; `action2` writes to `y`; `actionX` and `actionY` do not start because their outcome states are already filled; `action3` writes to `end`.

## References