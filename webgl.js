var gl;
var vertexPositionsBuffer;
var vertexColoursBuffer;
var modeUniform;
var bgTexture;

$(function () {
    var canvas = $('canvas')[0];

    try {
        gl = canvas.getContext('experimental-webgl');
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
        console.error('failed to initialize webgl');
        throw e;
    }

    function createShader(type, elementSelector) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, $(elementSelector).text());
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    var vertexShader = createShader(gl.VERTEX_SHADER, '#vertex-shader-src');
    var fragmentShader = createShader(gl.FRAGMENT_SHADER, '#fragment-shader-src');

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    vertexPositionAttribute = gl.getAttribLocation(program, 'vertexPosition');
    gl.enableVertexAttribArray(vertexPositionAttribute);

    vertexColourAttribute = gl.getAttribLocation(program, 'vertexColour');
    gl.enableVertexAttribArray(vertexColourAttribute);

    modeUniform = gl.getUniformLocation(program, 'mode');

    vertexPositionsBuffer = gl.createBuffer();
    vertexColoursBuffer = gl.createBuffer();

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    bgTexture = initTextures();
});

function render() {
    renderBg();
}

function renderBg() {
    var vertexPositions = [
        [-1, -1],
        [-1,  1],
        [ 1,  1],
        [ 1, -1]
    ];

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(modeUniform, 0);

    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.QUADS, 0, i);
}

function renderPoints() {
    var vertexPositions = [];
    var vertexColours = [];

    for (var i = 0; i < 100; i++) {
        vertexPositions.push(Math.random() * 2 - 1); // x
        vertexPositions.push(Math.random() * 2 - 1); // y
        vertexColours.push(Math.random()); // red
        vertexColours.push(Math.random()); // green
        vertexColours.push(Math.random()); // blue
    }

    gl.uniform1i(modeUniform, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColoursBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColours), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexColourAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.POINTS, 0, i);
}

function initTextures() {
    var texture = gl.createTexture();
    var image = new Image();
    image.onload = function() {
        handleTextureLoaded(image, texture);
        render();
    }
    image.src = 'street.jpg';
    return texture;
}

function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
}
