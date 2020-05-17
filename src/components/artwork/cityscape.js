const { lerp } = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');
const palettes = require('nice-color-palettes');

// random.setSeed(100);

const Cityscape = (ctx, width, height) => {

    drawToCanvas(ctx, width, height);
    
};

// creates a grid of points which are used as anchor points for each shape
const createGrid = () => {
    const points = [];
    const count = 6;
    const palette = random.shuffle(random.pick(palettes))

    for (let x = 0; x < count; x++) {
      for (let y = 0; y < count; y++) {
        const u = count <= 1 ? 0.5 : x/(count-1);
        const v = count <= 1 ? 0.5 : y/(count-1);
        // const radius = Math.abs(random.noise2D(u,v)*0.5); 


        points.push({
          color: random.pick(palette),
          position: [u, v],
        });
      }
    }

    return points;
  };

const drawToCanvas = (ctx, width, height) => {
    console.log("renderToCanvas function");

    let points = createGrid();
    const margin = width*0.05;

    // pick one random colour from the array of colours
    const fillColour = random.pick(random.pick(palettes));

    ctx.fillStyle = fillColour;
    ctx.fillRect(0,0, width, height);

    const bottomY = height-margin;

    // stop if there is one or zero points remaining
    while (points.length > 1) {
        points = random.shuffle(points);
        let point1 = points.pop();
        let point2 = points.pop();

        let [u1, v1] = point1.position;
        let [u2, v2] = point2.position;

        // don't allow x axis to be shared, or rectangles to form
        // if (u1 === u2 || v1 === v2) {
            // continue;
        // }

        let xPos1 = lerp(margin, width - margin, u1);
        let yPos1 = lerp(margin, height - margin, v1);
        let xPos2 = lerp(margin, width - margin, u2);
        let yPos2 = lerp(margin, height - margin, v2);
        
        console.log(xPos1, xPos2, yPos1, yPos2)
        ctx.beginPath();    
        ctx.moveTo(xPos1, yPos1);

        ctx.lineTo(xPos1, bottomY);
        // connect two random points on the grid
        ctx.lineTo(xPos2, bottomY);

        // draw lines to the bottom from each point
        ctx.lineTo(xPos2, yPos2);
        ctx.lineTo(xPos1, yPos1);

        // stroke with a background colour
        ctx.strokeStyle = fillColour;
        ctx.lineWidth = 20;
        ctx.fillStyle = point1.color;
        ctx.fill();

        ctx.closePath();
        ctx.stroke();

    }


};

export default Cityscape;