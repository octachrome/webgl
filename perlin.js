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
    var vertexPositions = [
        -1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0,

         1.0,  1.0,
        -1.0, -1.0,
         1.0, -1.0
    ];

    var vertexPositionsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    function drawFrame() {
        // clear screen
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // draw the two triangles
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    (function animationFrame() {
        requestAnimationFrame(animationFrame);
        drawFrame();
    })();
});
