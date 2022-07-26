# EarleyScottVisualizer
Visualizer that shows how the enhanced Earley algorithm by Elizabeth Scott works, showing all queues, Earley-sets and the final result.

## Prerequisites
Open up a cli and cd to the client folder and run `npm install nodemon -g`.
The run `npm install` to install dependencies.

Next cd to the server folder and run `npm install` to install its dependencies.

## How to run locally?
Start the server by opening a cli in the server folder and run `node app.js` or start debugging in VS Code by starting ESV Server which is defined in launch.json.

Start the client by opening another cli (this can be done in VS Code) in the client folder and run `nodemon app.js` and then either open a browser manually to localhost:3500 or debug in VS Code by starting "Start Chrome against localhost" which is also defined in launch.json.