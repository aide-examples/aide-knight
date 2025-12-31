# Knight's Tour

<img src="Thomasson_symmetric_closed_knights_tour.svg.png"/>

# Background

The search for a path on which a knight visits every square of a chessboard exactly once is a standard problem frequently used to teach the basics of programming and to introduce simple algorithms such as backtracking and potential heuristic improvements.

Countless programs exist on the web that solve this problem in various programming languages.

Can Agentic Coding provide added value here? We believe it depends on what the specific learning objective is.


# Initial Assumptions

It is expected that the basics of programming are known — specifically imperative statements, arrays, functions, and parameter passing (by value and by reference).

# The Classical Approach

The requirement is to program the algorithm using recursion to implement pure backtracking. It is then discovered that a 6x6 field is still manageable this way, but an 8x8 field requires an additional heuristic, which essentially states: "If you feel constricted, move into the narrow path early". The learning objective is achieved when there is technical proficiency in implementing the recursive search and in selecting the next move according to this rule.

As a bonus, it will usually be pointed out that many runtime environments have technical limitations regarding recursion (stack limits), which can sometimes be extended via system settings or, if necessary, bypassed by implementing a custom stack management system.


# How Could An AI-supported Approach Work?

## Step 1

The problem is presented in 10 minutes. It is pointed out that humans are not particularly good at systematically playing through all conceivable moves, but machines can do this perfectly if explained precisely how to proceed. The term "search tree" is introduced, along with a hint that corner squares might be particularly problematic. Question: Is a computer fast enough to try all conceivable move sequences? Approximately how many steps will it take to find a solution?

This is followed by a group discussion in which backtracking and systematic search are recognized as two solution elements that must obviously be combined. This includes vague guesses about complexity, which should *first* be underpinned by one's own reasoning and then validated through research. Whether the terms exponential, polynomial, or factorial complexity come into play is left to chance; the teacher can deepen this point later.


## Step 2

An agent is asked to find a program (including source code) on the web or to produce one itself that already contains these two elements and is suitable for expansion with one's own ideas. It is the **students' task to formulate a suitable prompt**. They could use the following criteria, for example:
- The program should be well-structured and documented.
- We only accept English code and English comments.
- The program must be executable locally.
- A compilation step is acceptable (or undesirable).
- The result is output to the console.
- The input will happen through the command line.
- In addition to the (first found) solution, the required computing time must be displayed.
- When calling the program, one can specify the size of the playing field (x, y) and which algorithm should be used (pure back-tracking or combined with heuristic mose selection)

It is up to the students -and a core part of their learning experience - whether they fire such a prompt as a single transaction or if they start a discussion where they explain their intention of modifying the program later, before narrowing down their expectations. 


# Step 3

The program is installed, executed and tested. Then the code will be examined for 5 minutes (300 seconds, indeed), perhaps adding a few comments or highlighting some statements on a printed copy of the source code.


# Step 4

Now the actual work begins, with all changes to the program being executed by the agent. This will allow us to focus on execution speed and enhance problem complexity.

- Search for a solution with 50x50 squares.
    - Programs working directly with recursion will encounter difficulties with stack limits here.
    - Affected student groups will have to look for better programs by appropriately expanding their prompt. Or they ask for re-engineering of their current code.
    - Inspecting the changes at code level is optional. Testing is not. 
- The way how available squares for the next move are determined probably follows a fixed scheme in all programs, usually "circular". Does the execution time change if a different (but always the same) order is used?
- We recognize that the search order mentioned above always plays a role when there are several moves with equal degrees of freedom.
- We test more hypotheses, e.g., it could be advantageous to proceed from the outside in — i.e., when moves are of equal value, always choose the one that leads us closer to the edge of the playing field.
- Why do we always start at the top left? Can it be advantageous to start exactly one move away from that field? Or is it more promising to start in the center?
- We introduce "blocked squares" — an even number of squares (half black, the other half white! Why?) that cannot and should not be entered. We store a few arrangements of such squares in the code and allow these examples to be selected via the command line.
- If we use extreme arrangements of such squares (like blocking one of the two entry points for each corner square) a human will easily see that a solution is definitely impossible because you have four dead ends. Our program might instead burn hours of CPU in such a case. Can we add an ability to identify (some) non solvable problems?
- If we have very large playing areas (1,000 x 1,000, for example), it should be possible to work with **tiling**! Research shows that others have done this before us. We develop our own thoughts on the "building blocks" which we would need for tiling and then look for sources on how this (certainly non-trivial) problem was solved. We accept that it is beyond our possibilities to re-invent that wheel.

# Summary

Through the use of an agent, the understanding of the application domain gains dominance over the technical implementation. This becomes particularly clear when switching from the recursively programmed version to a self-managed stack of the move history.
Given a fixed amount of time for teachers and learners, one must decide whether this kind of change to a program is a core goal of the education or whether it is sufficient to know that "there can be technical problems with recursion, but they can somehow be solved".

**There will be no universal answer to this.** Some computer scientists must be able to deal with all flavours of recursiveness; many others will never design or maintain a system in their professional lives in which recursion occurs.

The advantage that Agentic Coding offers us is that we can provide a path for the latter group where they can put their energy more on experimental, problem-solving behavior - while still getting a general understanding on how to implement a working solution and at least having heard once in their life of *recursion*.

And if one of those half-educated software engineers should happen to face a system where recursion is used at crucial points? The AI will be happy to explain...