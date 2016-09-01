var gl;
var vertexPositionsBuffer;
var vertexColoursBuffer;
var texCoordsBuffer;
var vertexPositionsAttribute;
var vertexColoursAttribute;
var texCoordsAttribute;
var modeUniform;
var textureUniform;
var frameBuffer;
var glowTexture;
var bgTexture;
var filterTexture;

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

    texCoordsAttribute = gl.getAttribLocation(program, 'texCoords');
    gl.enableVertexAttribArray(texCoordsAttribute);

    modeUniform = gl.getUniformLocation(program, 'mode');
    textureUniform = gl.getUniformLocation(program, 'texture');

    vertexPositionsBuffer = gl.createBuffer();
    vertexColoursBuffer = gl.createBuffer();
    texCoordsBuffer = gl.createBuffer();

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    glowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glowTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glowTexture, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    filterTexture = createFilterTexture();
    bgTexture = loadTexture('street.jpg');
    flareTexture = loadTexture('flare2.png');
});

// A Gaussian filter stored in a texture.
function createFilterTexture() {
    var texture = gl.createTexture();
    var filter = [
        0.003765,    0.015019,    0.023792,    0.015019,    0.003765,
        0.015019,    0.059912,    0.094907,    0.059912,    0.015019,
        0.023792,    0.094907,    0.150342,    0.094907,    0.023792,
        0.015019,    0.059912,    0.094907,    0.059912,    0.015019,
        0.003765,    0.015019,    0.023792,    0.015019,    0.003765
    ];
    var filterSize = Math.sqrt(filter.length);
    var data = [];
    var k = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            if (i < filterSize && j < filterSize) {
                data.push(Math.floor(filter[k++] * 255));   // R
            }
            else {
                data.push(0);   // R
            }
            data.push(0);   // G
            data.push(0);   // B
            data.push(255); // A
        }
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(data));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function render() {
    renderBg();
    renderTexture();
    // renderPoints();
}

function renderTexture() {
    var vertexPositions = [0, 0];
    var vertexColours = [1, 1, 1];
    var texCoords = [0, 0];

    gl.bindTexture(gl.TEXTURE_2D, flareTexture);
    gl.uniform1i(textureUniform, 0); // we are implicitly bound to texture unit 0
    gl.uniform1i(modeUniform, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColoursBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColours), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexColourAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(texCoordsAttribute, 2, gl.FLOAT, false, 0, 0);

    // gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // gl.clearColor(0, 0, 1, 0);
    // gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.POINTS, 0, 1);

    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderBg() {
    var vertexPositions = [
        -1, -1,
        -1,  1,
         1,  1,
         1, -1
    ];
    var vertexColours = [
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0
    ];
    var texCoords = [
        1, 1,
        1, 0,
        0, 0,
        0, 1
    ];

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColoursBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColours), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexColourAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(texCoordsAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.uniform1i(textureUniform, 0); // we are implicitly bound to texture unit 0
    gl.uniform1i(modeUniform, 0);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function renderPoints() {
    var vertexPositions = [];
    var vertexColours = [];
    var texCoords = [];

/*    for (var i = 0; i < 100; i++) {
        vertexPositions.push(Math.random() * 2 - 1); // x
        vertexPositions.push(Math.random() * 2 - 1); // y
        vertexColours.push(Math.random()); // red
        vertexColours.push(Math.random()); // green
        vertexColours.push(Math.random()); // blue
        texCoords.push(0);
        texCoords.push(0);
    }
*/

    vertexPositions.push(Math.random() * 2 - 1); // x
    vertexPositions.push(Math.random() * 2 - 1); // y
    vertexColours.push(Math.random()); // red
    vertexColours.push(Math.random()); // green
    vertexColours.push(Math.random()); // blue
    texCoords.push(0);
    texCoords.push(0);

    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.uniform1i(textureUniform, 0); // we are implicitly bound to texture unit 0
    gl.uniform1i(modeUniform, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColoursBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColours), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexColourAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(texCoordsAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, 1);
}

var textureCount = 0;

function loadTexture(src, cb) {
    textureCount++;
    var texture = gl.createTexture();
    var image = new Image();
    image.onload = function() {
        handleTextureLoaded(image, texture);
        textureCount--;
        if (textureCount == 0) {
            render();
        }
    }
    image.src = src;
    return texture;
}

function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
}
