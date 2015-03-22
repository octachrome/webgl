$(function () {
    var canvas = $('canvas')[0];

    var gl;
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

    var vertexPositions = [];
    var vertexColours = [];

    for (var i = 0; i < 100; i++) {
        vertexPositions.push(Math.random() * 2 - 1); // x
        vertexPositions.push(Math.random() * 2 - 1); // y
        vertexColours.push(Math.random()); // red
        vertexColours.push(Math.random()); // green
        vertexColours.push(Math.random()); // blue
    }

    var vertexPositionsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    var vertexColoursBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColoursBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColours), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexColourAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.POINTS, 0, i);
});
