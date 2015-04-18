$(function () {
    var canvas = $('canvas')[0];

    var gl = canvas.getContext('experimental-webgl');

    /**
     * @param type either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
     * @param elementSelector a jQuery selector for an element which contains the shader source
     */
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

    // this attribute is used to specify the position of each vertex
    vertexPositionAttribute = gl.getAttribLocation(program, 'vertexPosition');
    gl.enableVertexAttribArray(vertexPositionAttribute);

    var noiseArray = [];
    for (var i = 0; i < 1024*1024; i++) {
        var angle = 2 * Math.PI * Math.random();
        noiseArray.push(127 + Math.sin(angle) * 127, 127 + Math.cos(angle) * 127, 0, 255);
    }
    var noiseTexture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(program, "noise_texture"), 0); // texture 0

    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // memory alignment for pixels in the texture array (bytes)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(noiseArray));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


    // two triangles which cover the whole screen
    // they use normalized device coordinates, to save convering them in the vertex shader
    var backgroundTriangleFan = [
        -1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0,
         1.0, -1.0
    ];

    var bubblePoints = [];
    for (var i = 0; i < 10; i++) {
        bubblePoints.push(Math.random() * 2 - 1);
        bubblePoints.push(Math.random() * 2 - 1);
    }

    var vertexPositionsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionsBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    var offsetUniform = gl.getUniformLocation(program, "offset");
    var offset = 0;

    var shaderModeUniform = gl.getUniformLocation(program, "shaderMode");

    function drawFrame() {
        // scroll
        gl.uniform1f(offsetUniform, offset);
        offset += .001;

        // move the bubbles
        for (i = 0; i < bubblePoints.length; i += 2) {
            // x
            bubblePoints[i] += Math.random() * .001 - .0005;
            // y
            bubblePoints[i+1] += .001;
        }

        // clear screen
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // draw the background (two triangles)
        gl.uniform1i(shaderModeUniform, 0);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(backgroundTriangleFan), gl.STATIC_DRAW);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, backgroundTriangleFan.length / 2);

        // draw the bubbles
        gl.uniform1i(shaderModeUniform, 1);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bubblePoints), gl.STATIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, bubblePoints.length / 2);
    }

    (function animationFrame() {
        requestAnimationFrame(animationFrame);
        drawFrame();
    })();
});
