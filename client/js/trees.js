// Skoða þetta og nánar.
// https://javascript.info/mouse-drag-and-drop

//const { text } = require("express");


// Svo þarf ég að finna út hvernig við teiknum strik á milli nóða.
// Kannski þetta en þá þarf að nota canvas.
// Prófa á morgun að segja nóður yfir canvas og teikna svo strik á milli.


// Nei, nota frekar SVG.
let textInEllipse = document.getElementById("textInEllipse");
let bbox = textInEllipse.getBBox();
console.log(bbox.width);

let currentX = Number(textInEllipse.getAttribute("x"));
let newX = currentX - bbox.width/2;
console.log("Current X: " + currentX);
console.log("Formula: " + currentX + " - " + bbox.width + " / 2");
console.log("New X: " + (currentX - bbox.width/2))

textInEllipse.setAttribute("x", newX);