<script lang="ts">
    import { onMount } from "svelte";
    import Matter from "matter-js";

    let container: HTMLDivElement;
    let width = 1000;
    let height = 500;

    onMount(() => {
        const { Engine, Render, Runner, Bodies, Composite, Constraint } = Matter;

        const engine = Engine.create();

        const render = Render.create({
            element: container,
            engine: engine,
            options: {
                wireframes: false,
                background: "#ff5733"
            }
        });

        render.canvas.width = width;
        render.canvas.height = height;

        const boxA = Bodies.rectangle(400, 200, 80, 20);
        const boxB = Bodies.rectangle(440, 200, 80, 20);
        const ground = Bodies.rectangle(width / 2, height - 30, width, 60, { isStatic: true });

        const joint = Constraint.create({
            bodyA: boxA,
            bodyB: boxB,
            pointA: { x: 40, y: 0 },
            pointB: { x: 40, y: 0 },
            length: 5,
            stiffness: 0,
        });

        Composite.add(engine.world, [boxA, boxB, joint, ground]);

        Render.run(render);

        const runner = Runner.create();
        Runner.run(runner, engine);
    });
</script>

<div class="canvas-container">
    <div bind:this={container} style="width: {width}px; height: {height}px;"></div>
</div>

<style>
    .canvas-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }

    div {
        border: 1px solid #ccc;
    }
</style>