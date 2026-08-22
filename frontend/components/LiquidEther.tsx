'use client';

import React, { useEffect, useRef, useState } from 'react';

interface LiquidEtherProps {
  className?: string;
}

export default function LiquidEther({ className = '' }: LiquidEtherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);

  // Monitor the html class list for dark mode changes
  useEffect(() => {
    const checkTheme = () => {
      const isHtmlDark = document.documentElement.classList.contains('dark');
      setIsDark(isHtmlDark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) {
      console.warn('WebGL is not supported by this browser.');
      return;
    }

    // Vertex Shader (renders a full-screen quad)
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        // Flip y for texture coordinates
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader (Premium Domain-Warped Fluid Shader with dynamic colors and mouse interaction)
    const fsSource = `
      precision highp float;

      varying vec2 v_uv;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_theme; // 0.0 for light, 1.0 for dark

      // Simple 2D Pseudo-random noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      // 2D Value Noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      // Fractal Brownian Motion (FBM) - 3 Octaves for high performance
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 3; i++) {
          value += amplitude * noise(p * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        // Pixel coordinates normalized
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // Correct aspect ratio
        float aspect = u_resolution.x / u_resolution.y;
        vec2 st = uv;
        st.x *= aspect;

        // Smoothly interpolate mouse coordinates (normalized)
        vec2 m = u_mouse / u_resolution.xy;
        m.x *= aspect;

        // Calculate distance to mouse for interaction
        float distToMouse = distance(st, m);
        
        // Add dynamic interactive warping around the cursor
        float mouseForce = smoothstep(0.4, 0.0, distToMouse) * 0.15;
        vec2 mouseDir = normalize(st - m + 0.001);
        st += mouseDir * mouseForce;

        // Domain Warping: Wiggle coordinates organically over time
        float t = u_time * 0.12;
        
        // Layer 1 warp
        vec2 q = vec2(
          fbm(st + vec2(0.0, 0.0) + t),
          fbm(st + vec2(5.2, 1.3) + t)
        );

        // Layer 2 warp (creates the "liquid" swirling effect)
        vec2 r = vec2(
          fbm(st + 4.0 * q + vec2(1.7, 9.2) + t * 0.5),
          fbm(st + 4.0 * q + vec2(8.3, 2.8) + t * 0.3)
        );

        // Compute the final fluid noise value
        float f = fbm(st + 4.0 * r);

        // --- Color Palettes ---
        
        // Dark Mode Palette (luminous charcoal, metallic silver/platinum, and steel grey)
        vec3 darkBackground = vec3(0.00, 0.00, 0.00); // pure deep black
        vec3 darkColor1 = vec3(0.20, 0.22, 0.26);     // Luminous Steel Grey
        vec3 darkColor2 = vec3(0.36, 0.39, 0.44);     // Metallic Silver/Platinum Accent
        vec3 darkColor3 = vec3(0.10, 0.11, 0.13);     // Mid-tone Obsidian Grey
        
        vec3 darkResult = mix(darkBackground, darkColor1, f * 0.95);
        darkResult = mix(darkResult, darkColor2, r.x * 0.85);
        darkResult = mix(darkResult, darkColor3, q.y * 0.75);
        // Add a brighter, highly visible premium metallic highlight
        darkResult += vec3(0.18, 0.20, 0.25) * pow(f, 3.0);

        // Light Mode Palette (vibrant pastel lavender, pink, sky blue, and silver)
        vec3 lightBackground = vec3(0.96, 0.96, 0.98); // clean off-white silver base
        vec3 lightColor1 = vec3(0.72, 0.65, 0.90);     // Luminous Soft Indigo/Lavender
        vec3 lightColor2 = vec3(0.60, 0.82, 0.95);     // Dreamy Soft Sky Blue
        vec3 lightColor3 = vec3(0.95, 0.68, 0.80);     // Dreamy Soft Rose Pink
        
        vec3 lightResult = mix(lightBackground, lightColor1, f * 0.85);
        lightResult = mix(lightResult, lightColor2, r.y * 0.70);
        lightResult = mix(lightResult, lightColor3, q.x * 0.65);

        // Blend between light and dark outputs based on the current theme uniform
        vec3 finalColor = mix(lightResult, darkResult, u_theme);

        // Premium subtle film grain overlay
        float grain = (hash(uv + u_time * 0.01) - 0.5) * 0.035;
        finalColor += vec3(grain);

        // Safe clamp and final output
        gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
      }
    `;

    // Helper to compile shader
    const compileShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    // Create program
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program linking failed:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Setup full-screen quad positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const themeLoc = gl.getUniformLocation(program, 'u_theme');

    // Mouse and theme target states
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;
    let currentThemeVal = isDark ? 1.0 : 0.0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      // WebGL y coordinate starts from the bottom
      targetMouseY = rect.height - (e.clientY - rect.top);
    };

    // Listen to mousemove on window or direct parent
    window.addEventListener('mousemove', handleMouseMove);

    // Resize handling with high DPI support
    const resizeCanvas = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || window.innerWidth;
      const height = rect?.height || window.innerHeight;
      
      // Standard resolution scale
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for great performance
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Animation variables
    let animationFrameId: number;
    let startTime = performance.now();
    let isVisible = true;

    // IntersectionObserver to pause the render loop when scrolled offscreen
    const io = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.01 });

    if (containerRef.current) {
      io.observe(containerRef.current);
    }

    // Render loop
    const render = (now: number) => {
      if (!isVisible) {
        // If not visible, just request next frame without drawing (power saving)
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const elapsed = (now - startTime) * 0.001;

      // Soft lerping for organic, liquid mouse movement
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      // Soft transition for dark/light mode switches
      const targetThemeVal = isDark ? 1.0 : 0.0;
      currentThemeVal += (targetThemeVal - currentThemeVal) * 0.08;

      gl.useProgram(program);

      // Pass uniforms
      gl.uniform1f(timeLoc, elapsed);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      
      // Calculate mouse relative to DPI scaling
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      gl.uniform2f(mouseLoc, mouseX * dpr, mouseY * dpr);
      gl.uniform1f(themeLoc, currentThemeVal);

      // Clear & Draw
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      io.disconnect();
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      gl.deleteBuffer(positionBuffer);
    };
  }, [isDark]);

  const maskStyle: React.CSSProperties = {
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
  };

  return (
    <div ref={containerRef} style={maskStyle} className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none select-none opacity-95 dark:opacity-95 mix-blend-normal transition-opacity duration-1000"
      />
    </div>
  );
}
