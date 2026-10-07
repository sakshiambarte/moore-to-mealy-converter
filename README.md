# Moore to Mealy Converter

A standalone Theory of Computation educational web app.

## Exact application flow
1. MOORE INPUT
2. MOORE TABLE
3. MOORE DIAGRAM
4. CONVERT
5. MEALY TABLE
6. MEALY DIAGRAM

## How to run
1. Extract the ZIP.
2. Open `index.html` in Chrome/Edge/Firefox.
3. The sample Moore machine loads automatically.
4. Click **Generate Moore Machine** to create the Moore table and diagram.
5. Click **CONVERT TO MEALY** to create the Mealy table and diagram.

No Node.js, Python, server, database, or internet connection is required.

## Input format
- States: `q0,q1,q2`
- Input symbols: `0,1`
- Start state: `q0`
- Outputs: `q0:0,q1:1,q2:0`
- Transitions: one per line as `currentState,input,nextState`

## Conversion rule
If the Moore transition is:
`q0 -- 1 --> q1`
and the output of `q1` is `0`, the Mealy transition becomes:
`q0 -- 1/0 --> q1`
