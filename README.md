# CodeRats
Track your friends perfomance through CodeRats!

This websites utilizes Codeforces API to score (based on accepted problem's ratings) particpant's points. It also shows the highest rating problem solved so far and the 20 last solved problems, along with their solvers and how much they gained from said solution.

The flask server is just for testing. To configure the website, put your friends username on the "handles" array on script.js, along with the unix timestamp from the start date of your competition!.

# Score calculation
To avoid farming points with easy problems, the score is given depending on the amount of problems solved with that rating, scaling with a logarithmic function. We have that a given problem rating $R$ with $x$ problems solved gives a score defined as:
```math 
score(R,x) = R(1+2.5\log x)
```
