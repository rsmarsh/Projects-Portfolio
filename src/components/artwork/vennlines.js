const { lerp } = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');
const palettes = require('nice-color-palettes');

// initialise the empty grid of cells 
let cellGrid = [];
let gridSize = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let canvasMargin = 0;
let ctx;

// initial default values, but may be overridden by user selected options
let configOptions = {
    gridSize: 18,
    lineWidth: 10,
    seed: random.getRandomSeed(),
    showGrid: false
};

// the customisable options available to the user to modify the output
const userOptions = [

    // the number of points on the grid on each x/y axis
    {
        type: "slider",
        label: "Grid Size",
        property: "gridSize",
        default: configOptions.gridSize,
        bounds: {
            min: 2,
            max: 30,
        }
    },

    // the thickness of the lines
    {
        type: "number",
        label: "Line Width",
        property: "lineWidth",
        default: configOptions.lineWidth
    },

    // whether a grid should be drawn on the canvas
    {
        type: "checkbox",
        label: "Show Grid",
        property: "showGrid",
        default: false
    },

    {
        type: "checkbox",
        label: "Random Line Colours",
        property: "randomLineColours",
        default: false
    },

    {
        type: "checkbox",
        label: "Coloured Background",
        property: "colouredBackground",
        default: false
    }

    // TODO: rounded corners checkbox
    
];


const Vennlines = (ctx, width, height, addSettings, customSettings = {}) => {
    
    random.setSeed(configOptions.seed);
    console.log(`seed: ${random.getSeed()}`);
    
    // merge in and overwrite any default settings with the user defined settings
    let artSettings = {...configOptions, ...customSettings};
    drawToCanvas(ctx, width, height, artSettings);

    createSettings(addSettings);

};

// trigger the callback with al of the customisation options
const createSettings = (addSettings) => {
    addSettings(userOptions);
};

// creates a grid of points which are used as anchor points for each shape
const createGrid = (gridSize) => {
    const cells = [];
    const count = gridSize;

    // so that cells can be identified as touching the edge
    const edge = count-1;

    // create an equal x/y grid
    for (let row = 0; row < count; row++) {
        cells[row] = [];
        for (let col = 0; col < count; col++) {

            // add initial object to each grid cell, representing which sides are untouched
            cells[row][col] = {
                x: col,
                y: row,
                top: false,
                right: false,
                bottom: false,
                left: false,
                edge: false
            };

            // flip the edge boolean so that edge pieces can be easily found
            if ( (row === 0 || row === edge) || (col === 0 || col === edge)) {
                cells[row][col].edge = true;
                
                // find which edge of the cell is touching a side
                let touching;
                if (row === 0) {
                    touching = 'top';
                } else if (row === edge) {
                    touching = 'bottom';
                } else if (col === 0) {
                    touching = 'left';
                } else if (col === edge) {
                    touching = 'right';
                } else {
                    console.error('edge piece without an identifiable side');
                }
                cells[row][col].touching = touching;
            }

        }
    }

    return cells;
};

const drawToCanvas = (canvasCtx, width, height, settings) => {
    // reassign global vars each redraw
    ctx = canvasCtx;
    gridSize = settings.gridSize;
    cellGrid = createGrid(gridSize);
    canvasWidth = width;
    canvasHeight = height;
    canvasMargin =  0; //width * 0.05;
   

    let singlePalette = random.pick(JSON.parse(JSON.stringify(palettes)));
    
    let backgroundColor = '#fff';
    
    console.log(singlePalette);
    if (settings.colouredBackground) {
        // pop this so that a line does not end up using the same as a background colour
        backgroundColor = singlePalette.pop();
    } 
    
    let fillColour = random.pick([...singlePalette]);
    
    // clear the canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);


    if (settings.showGrid) {
        drawGrid();
    }

    let edgeCell = getFreeEdgeCell();

    while (edgeCell) {

        // even though this might not be used, this saves the seed based randomness so that activating it keeps the same pattern
        let randomLineColour = random.pick(singlePalette);
        if (settings.randomLineColours) {
            fillColour = randomLineColour;
        }

        drawNewLine(edgeCell, {...settings, fillColour});
        edgeCell = getFreeEdgeCell();
    }
};

const drawGrid = () => {
    const cellSize = getCellSize();

    ctx.beginPath();

    ctx.lineWidth = "1";
    ctx.strokeStyle = "black";

    // vertical lines
    for (let v = 0; v < gridSize; v++) {
        ctx.moveTo(v*cellSize, 0);
        ctx.lineTo(v*cellSize, canvasHeight);
    }

    // horizontal lines
    for (let h = 0; h < gridSize; h++) {
        ctx.moveTo(0, h*cellSize);
        ctx.lineTo(canvasWidth, h*cellSize);
    }

    ctx.stroke();
};

const getFreeEdgeCell = () => {
    // pick a random cell from the cellgrid where the cell is touching an edge
    let cell = random.pick(cellGrid.flat().filter(cell => cell.edge));
 
    // when no edge pieces remain, stop create new lines
    if (!cell) {
        return false;
    }
    
    // prevent this square from being used an an edge again
    cell.edge = false; 

    return cell;
};

const drawNewLine = (nextCell, settings) => {
    let lineLength = 0;
    let firstCell = true;
    let fromSide = nextCell.touching

    ctx.beginPath();

    while (nextCell) {
        // an adjacent cell andnext direction is returned if available
        let {adjacentCell, adjacentDirection} = drawNextSegment(nextCell, fromSide, firstCell);
        
        nextCell = adjacentCell;
        fromSide = adjacentDirection;

        firstCell = false;
        lineLength +=1;
    }

    // stroke with a background colour
    ctx.strokeStyle = settings.fillColour;
    ctx.lineWidth = settings.lineWidth;
    ctx.fillStyle = settings.color;

    ctx.stroke();

};

const drawNextSegment = (startCell, fromSide, isFirstSegment) => {
    let finalSegment = false;
    let finalCell;
    let finalDirection;
    // each section of a line targets an adjacent segment
    let {adjacentCell, direction} = getFreeAdjacentCell(startCell);
    let adjacentDirection;
    
    // mark these two connecting sides as used
    startCell[direction] = true;

    // the end has been reached and no available adjacent cells exist, however there may be one left within this cell before ending
    if (!adjacentCell) {
        finalSegment = true;

        // if the first segment is also the last, we need to explicitly mark the entry point as used
        if (isFirstSegment) {
            startCell[fromSide] = true;
        }
        let freeSide = getFreeSide(startCell);
        
        if (!freeSide) {
            return false;
        }

        finalCell = startCell;
        finalDirection = freeSide;
    }

   
    if (!finalSegment) {
        // the direction which the line will enter the adjacent cell from
        adjacentDirection = getOppositeDirection(direction);
        adjacentCell[adjacentDirection] = true;
        
    }

    
    let [startX, startY] = getDrawPosFromCell(startCell, fromSide);
    let [endX, endY] = getDrawPosFromCell(adjacentCell || finalCell, adjacentDirection || finalDirection);

    if (isFirstSegment) {
        ctx.moveTo(startX, startY);
        isFirstSegment = false;
    }
    ctx.lineTo(endX, endY);

    return {adjacentCell, adjacentDirection};
};


/**
 *  Applies a direction to the coordinates, returning the adjusted coordinates within an array [x, y]
 */ 
const applyDirectionToCellIndex = (x, y, direction) => {
    switch(direction) {
        case 'top':
            return [x, y-1];
        case 'right':
            return [x+1, y];
        case 'bottom':
            return [x, y+1];
        case 'left':
            return [x-1, y];
        default: 
            return false;
    }
};

/**
 * Provide a cell and a direction, and this will return the corresponding cell object if possible
 * @param {Object} cell
 * @param {String} direction - 'top', 'right', 'down' or 'left'
 */
const getAdjacentCell = (cell, direction) => {
    let [adjustedX, adjustedY] = applyDirectionToCellIndex(cell.x, cell.y, direction);
    return getCell(adjustedX, adjustedY);
};

/**
 * 
 * @param {Object} cell - the cell to find a free side within 
 */
const getFreeSide = (cell) => {
    let directions = random.shuffle(['top', 'right', 'bottom', 'left']);

    while (directions.length > 0) {
        let randomDirection = directions.pop();

        // one free side found
        if (cell[randomDirection] === false) {
            cell[randomDirection] = true;
            return randomDirection;
        }
    }

    // if no free sides were available
    return false;
}

const getFreeAdjacentCell = (cell, exclude) => {
    let directions = ['top', 'right', 'bottom', 'left'];
    directions.filter(direction => direction !== exclude);
    directions = random.shuffle(directions);

    while (directions.length > 0) {
        let nextDirection = directions.pop();
        // the direction that the adjacent cell will be entered from is needed to check for a free entry direction
        let originDirection = getOppositeDirection(nextDirection);

        let adjacentCell = getAdjacentCell(cell, nextDirection);

        // if undefined, then this is an index which is off the edge of the grid
        if (!adjacentCell) {
            continue;
        }

        // if a non-used side of an adjacent cell is found, return it
        if (adjacentCell[originDirection] === false) {
            return {
                adjacentCell, 
                direction: nextDirection
            };
        }
    }

    // if this is reached, then there are no more adjacent cells free
    return false;
    
}

const getOppositeDirection = (direction) => {
    switch(direction) {
        case 'top':
            return 'bottom';
        case 'right':
            return 'left';
        case 'bottom':
            return 'top';
        case 'left':
            return 'right';
        default:
            console.error("no direction provided");
    }
}

/**
 * Gets a single cell object at the provided position
 * 
 * @param {Number} x - x grid position
 * @param {Number} y - y grid position
 * 
 * @returns {Object|Boolean} return the cell object if found, otherwise return false/undefined
 */
const getCell = (x,y) => {
    // detect cells which are outside of the range by returning false
    if (!cellGrid[y]) {
        return false;
    }
    
    return cellGrid[y][x];
    
};

const getCellSize = () => {
       // find out the exact size of each square, after removing the side margins
       const drawAreaSize = (canvasWidth-(canvasMargin*2));
       const cellSize = drawAreaSize/gridSize;
       return cellSize; 
} 

/**
 * 
 * @param {Object} cell - the cell to get a position within 
 * @param {*} position - the exact position within the cell to use
 * 
 * @returns {Array} the x+y coordinates referring to the cell and position requested
 */
const getDrawPosFromCell = (cell, position) => {
    let x = cell.x/gridSize;
    let y = cell.y/gridSize;

    
    // convert to canvas based positioning
    x = lerp(canvasMargin, canvasWidth, x);
    y = lerp(canvasMargin, canvasHeight, y);
    
    const cellSize = getCellSize();
    
    // adjust the pixel coordinates to be at the requested position
    switch(position) {
        case 'top':
            x += cellSize/2;
            break;
        case 'right':
            x += cellSize;
            y += cellSize/2;
            break;
        case 'bottom':
            x += cellSize/2;
            y += cellSize;
            break;
        case 'left':
            y += cellSize/2;
            break;
        default:
            console.warn('no direction provided to get draw position');
            break;
    }

    return [x, y];
}

export default Vennlines;