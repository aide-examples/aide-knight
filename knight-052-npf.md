# PROMPT

We want to understand why composition was preferred over inheritance when
establishing the Warndorff rule besides pure DFS.
Although experienced students may feel that the AI has taken a good decision
others may not be so sure or may not be aware of alternative design options at all.

**Obviously you went for dependency injection. Why did you not use inheritance?**


# RESPONSE

# Why Dependency Injection Instead of Inheritance?

**Short answer:**

> Because move ordering is **behavior**, not **identity** — and inheritance would model the wrong abstraction.

This is a design question, not a Python trick.

---

## 1. What Inheritance Means

Inheritance expresses an **“is-a”** relationship:

> *A subclass **is a kind of** its base class.*

Using inheritance here would imply:

- `WarnsdorffKnightTourSolver` **is a** different kind of solver than
- `PureDFSKnightTourSolver`

But that is not true.

They:
- Solve the **same problem**
- Use the **same algorithm (DFS)**
- Maintain the **same state and invariants**

Only one thing changes:

> **The order in which successor moves are tried**

That is not a change of identity.

---

## 2. What Actually Varies

The varying element is:

- **Move ordering**

Move ordering is:
- A policy
- A strategy
- A replaceable behavior

This maps naturally to **composition / dependency injection**, not inheritance.

---

## 3. Liskov Substitution Principle (LSP)

A classic OO test:

> *If a subclass replaces its base class, should the program still behave correctly?*

With inheritance here:
- Subclasses would override tiny internal methods
- Most logic would remain identical
- Internal details (`_backtrack`) would have to be exposed or protected

That’s a strong **code smell**.

---

## 4. Inheritance Forces Artificial Structure

To use inheritance cleanly, you’d need something like:

