# Knight's Tour

<img src="Thomasson_symmetric_closed_knights_tour.svg.png"/>

# Background

The search for a path on which a knight visits every square of a chessboard exactly once is a standard problem frequently used to teach the basics of programming and to introduce algorithms such as backtracking and potential heuristic improvements.

Countless programs exist on the web that solve this problem in various programming languages.

Can Agentic Coding provide added value here? We believe it depends on what the specific learning objective is.


# Initial Assumptions

It is expected that the basics of programming are known — specifically imperative statements, arrays, functions, and parameter passing (by value and by reference).

# The Classical Approach

The task is to program a systematic tree search using recursion to implement pure backtracking. It is then discovered that a 6x6 field is still manageable this way, but an 8x8 field requires an additional heuristic, which essentially states: "If you feel constricted, move into the narrow path early". The learning objective is achieved when there is technical proficiency in implementing the recursive search and in selecting the next move according to this rule.

As a bonus, it will usually be pointed out that many runtime environments have technical limitations regarding recursion (stack limits), which can sometimes be extended via system settings or, if necessary, bypassed by implementing a custom stack management system.


# How Could An AI-supported Approach Work?

## Step 1

The problem is presented and it is pointed out that humans are not particularly good at systematically playing through all conceivable moves, but machines can do this perfectly if explained precisely how to proceed. The term "search tree" is introduced, along with a hint that corner squares might be problematic. Question: Is a computer fast enough to try all conceivable move sequences? Approximately how many steps will it take to find a solution?

This is followed by a group discussion in which systematic search and some mechanism to "try good moves first" are recognized as two solution elements that must obviously be combined. This includes guesses about complexity, which should *first* be underpinned by one's own reasoning and then validated through web research. Whether the terms exponential, polynomial, or factorial complexity come into play is left to chance; the discussion may also include aspects of CPU frequency and the number of cycles which could be necessary to make a single move. The teacher can deepen these points later. The students understand that even a good heuristic will not guarantee short run times and that it does not help at all if the problem has no solution. Thus they focus more on the *character of the problem* than on *how to implement tree search*. 


## Step 2

An agent is asked to find a program (including source code) on the web or to produce one itself that already contains the two elements mentioned above and is suitable for expansion with one's own ideas. It is the **students' task to formulate a suitable prompt**. They could use the following criteria, for example:
- We are looking for a program which solves the chessboard knight tour problem.
- It should contain systematic tree search
- It should hvae an option to try good moves first.
- It should stop after it has found a solution.
- The required computing time must be displayed.
- The program should be well-structured and documented.
- We want to enhance it with our own ideas.
- We only accept English code and English comments.
- The program must be executable locally.
- We prefer the following programming languages in this order: Python, Javascript, php, TypeScript, Java, C++, others
- OR : We prefer strictly typed languages.
- OR : We are looking for good performance and accept pre-processing or compiling
- The result is output to the console.
- The input will happen through the command line.
- When calling the program, one can specify the size of the playing field (x, y) and which algorithm should be used (pure back-tracking or combined with heuristic move selection)
- Look for good candidates in the web and offer the possibility to create such a program yourself
- Show at least three potential existing candidates and your own solution even if they do not meet all our criteria
- Produce a ranking table which for external pre-existing solutions contains links to the repective web resources

It is up to the students - and a core part of their learning experience - to create such a prompt. It could be wise not to issue such a prompt as a single transaction. They could also start a discussion with the AI where they explain their intentions before narrowing down their expectations. Ideally they will understand the pros and cons of "make vs. buy". Maybe they also come up with exploring the problem before focusing on "get me a program", maybe they think of the situation they will face after they have gotten their "code present" ...

- "Give me a good conceptual paper on the Knight's Tour Problem which explains systematic search and ideas for improvement." The response may point to an article like this one: https://medium.com/@danielfrost_3076/implementing-a-heuristic-solution-to-the-knights-tour-problem-513a73cc7e20
- "Given I ask you to create the program yourself - will you then be especially good at explaining how it works?
- Or can you do the same kind of analysis and explanation for any program we would choose from the pre-existing candidates?"


# Step 3

The program is installed, executed and tested. Then the code will be examined for 5 minutes (300 seconds, indeed), perhaps adding a few comments or highlighting some statements on a printed copy of the source code.


# Step 4

Now the actual work begins, with most changes to the program being executed by the agent.

- **Explain** how the systematic search works. Use short code excerpts. 
- Where is the place in the code which identifies promising moves?
- Then we **run the program** for a really large board (100x100 or more).
    - Programs working with direct recursion will encounter difficulties with stack limits here - depending on the programming language and runtime environment.
    - Affected student groups will have to look for better programs by appropriately expanding their prompt. 
    - Or they ask for **re-engineering** of their current code.
    - Inspecting those changes at code level is optional. Testing is not.
    - Students should plan to compare the results of the initial and the improved version.
    - If they are using a highly integrated agent UI (like VS Code and Claude code) they may be able to delegate this task to the agent. 
- Now we think about the **Warnsdorff heuristic**. The way how available squares for the next move are determined probably follows a fixed scheme in all programs, usually "circular". Does the execution time change if a different (but always the same) order is used?
- We recognize that the search order mentioned above always plays a role when there are several moves with equal degrees of freedom.
- We **test more hypotheses**, e.g. Could it be advantageous to proceed from the outside in — i.e., "When moves are of equal value, always choose the one that leads us closer to the edge of the playing field." (to be implemented as a command line option)
- What about the **starting point** in the top left corner? Can it be advantageous to start exactly one move away from that field? Or is it more promising to start in the center? (to be implemented as command line options)
- Most probably the **growing number of command line options** will lead to the need to handle them and explain them to the user. So we might issue a prompt like "Our programm needs professional handling of command line options and explanations of what the user can do".
- Now we introduce **blocked squares** — an even number of squares (half black, the other half white! Why?) which cannot be touched by the knight. We store a few arrangements of such squares in the code and allow these examples to be selected via the command line. Maybe we also should offer to specify blocked squares via the command line...
- If we use extreme arrangements of blocked squares (like blocking one of the two entry points for each corner square) a human will easily see that a solution is definitely impossible because we have four dead ends. Our program might instead burn hours of CPU in such a case. Can we add an ability to **identify non solvable problems**?
- Let us spend a minute on art an aesthetics: the move sequence shown in the diagram on this README page is optically appealing due to its **symmetry** and because the moves form a **closed path**. This time we use a **strict intervention** by the teacher: You must implement an option which forces the solution to be a closed loop manually. You have nothing else but the code editor. AI is on holiday. For *advanced students* we have a harder challenge: Do the same with different flavours of symmetry!
- Finally the outlook: If we have very large playing areas (1,000 x 1,000, for example), it should be possible to work with **tiling**! Research shows that others have done this before us. We develop our own thoughts on the "building blocks" which we would need for tiling and then look for sources on how this (certainly non-trivial) problem was solved. We accept that it is **beyond our possibilities** to re-invent that wheel.

---

# Summary

Through the use of an agent, the understanding of the application domain gains dominance over the technical implementation. This becomes particularly clear when switching from the recursively programmed version to a self-managed stack of the move history.
Given a fixed amount of time for teachers and learners, one must decide whether this kind of change to a program is a core goal of the education or whether it is sufficient to know that "there can be technical problems with recursion, but they can somehow be solved".

**There will be no universal answer to this.** Some computer scientists must be able to deal with all flavours of recursiveness; many others will never design or maintain a system in their professional lives in which recursion occurs. Some must design highly optimized core algorithms which requires a thorough understanding of pointers, of explicit allocation and disposal of dynamic memory. Gladly most software engineers can rely on garbage collection nowadays.

---

Agentic coding can enhance the complexity of a program rapidly. Sometimes this leads to new hemispheres that would not have been touched by the traditional approach of teaching: In our example the students could learn how command line options are handled professionally. The AI will probably introduce a library for this. So the students will understand the usefulness of relying on "building blocks" instead of hand coding improvised command line parsing. Introducing agentic coding will allow talented students to explore complex enahncements while others struggle with the basics. This is a challenge for the teacher - and it is his reward for arranging a group-centric competetive learning experience for the students.

Taken to the extreme, one could apply the principle of "inverted classroom". In that approach the lesson would start with each group **already having gone through steps 1, 2 and 3 on their own**. Step 3 (code reading) could use more time in that approach.
The first minutes would be used to exchange experiences in a structured way, focusing on 
- the sequence and quality of AI prompts issued
- the quality of suggestions received
- the degree of confidence the groups have in their chosen platform for further extension

Then the **common work could start with step 4**. Yes, this will be a hard time for the teacher. Better have two or three of them for six groups working simultaneously.

---

Continously working with agentic coding improves the skill of formulating wishes, ideas, defining requests, reporting errors, considering enhancements, demanding suggestions and explanations, documenting the outcome. *As stated before we think this is an important aspect.*