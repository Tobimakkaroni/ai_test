<script lang="ts">
    import { onMount } from "svelte";
    import Matter from "matter-js";

    let container: HTMLDivElement;
    let width = 1000;
    let height = 500;
    type MatterBody = any;

    let distanceToGoal = 0;
    let episodeCount = 0;
    let totalReward = 0;
    let averageReward = 0;
    let bestReward = -Infinity;

    onMount(() => {
        const { Engine, Render, Runner, Bodies, Composite, Constraint, Events, Body, Vector } = Matter;

        const engine = Engine.create();

        const render = Render.create({
            element: container,
            engine: engine,
            options: {
                wireframes: false,
                background: "#ff5733",
                width,
                height
            }
        });

        const boxA = Bodies.rectangle(100, 200, 80, 20, {
            render: {
                fillStyle: '#FFFFFF',
                strokeStyle: '#000000',
                lineWidth: 2
            }
        });
        const boxB = Bodies.rectangle(185, 200, 80, 20, {
            render: {
                fillStyle: '#FFFFFF',
                strokeStyle: '#000000',
                lineWidth: 2
            }
        });
        const wallL = Bodies.rectangle(0, 290, 50, 300, {
            render: {
                fillStyle: '#FF0000',
                strokeStyle: '#000000',
                lineWidth: 2
            },
            isStatic: true
        });
        const wallR = Bodies.rectangle(1000, 290, 50, 300, {
            render: {
                fillStyle: '#FF0000',
                strokeStyle: '#000000',
                lineWidth: 2
            },
            isStatic: true
        });
        const goal = Bodies.circle(950, 400, 20, {
            render: {
                fillStyle: '#46ff33',
                strokeStyle: '#000000',
                lineWidth: 2
            },
            isStatic: true
        });

        const obstacle = Bodies.rectangle(500, 415, 50, 50, {
            isStatic: true,
            render: {
                fillStyle: '#FFFFFF',
                strokeStyle: '#000000',
                lineWidth: 2
            },
        });
        const ground = Bodies.rectangle(width / 2, height - 30, width, 60, { isStatic: true });

        const joint = Constraint.create({
            bodyA: boxA,
            bodyB: boxB,
            pointA: { x: 50, y: 0 },
            pointB: { x: -50, y: 0 },
            length: 0,
            stiffness: 1,
            angularStiffness: 0.01,
        });

        Composite.add(engine.world, [boxA, boxB, joint, ground, wallL, wallR, goal, obstacle]);

        Render.run(render);

        const runner = Runner.create();
        Runner.run(runner, engine);

        // Q-Learning Setup
        const actions = ['rotateA+', 'rotateA-', 'rotateB+', 'rotateB-', 'none'];
        const qTable: { [key: string]: number[] } = {};
        const alpha = 0.1; // Learning rate
        const gamma = 0.9; // Discount factor
        const epsilon = 0.1; // Exploration rate

        function getState(): string {
            return JSON.stringify({
                angleA: Math.round(boxA.angle * 10) / 10,
                angleB: Math.round(boxB.angle * 10) / 10,
                positionA: { x: Math.round(boxA.position.x / 10) * 10, y: Math.round(boxA.position.y / 10) * 10 },
                positionB: { x: Math.round(boxB.position.x / 10) * 10, y: Math.round(boxB.position.y / 10) * 10 }
            });
        }

        function getQ(state: string, action: string): number {
            if (!qTable[state]) qTable[state] = actions.map(() => 0);
            return qTable[state][actions.indexOf(action)];
        }

        function setQ(state: string, action: string, value: number): void {
            if (!qTable[state]) qTable[state] = actions.map(() => 0);
            qTable[state][actions.indexOf(action)] = value;
        }

        function getReward(): number {
            distanceToGoal = Math.hypot(goal.position.x - boxB.position.x, goal.position.y - boxB.position.y);
            return -distanceToGoal;
        }

        function chooseAction(state: string): string {
            if (Math.random() < epsilon) {
                return actions[Math.floor(Math.random() * actions.length)];
            } else {
                const stateQ = qTable[state] || actions.map(() => 0);
                return actions[stateQ.indexOf(Math.max(...stateQ))];
            }
        }

        function performAction(action: string): void {
            const rotationForce = 0.05;

            if (action === 'rotateA+') {
                Body.setAngularVelocity(boxA, rotationForce);
            } else if (action === 'rotateA-') {
                Body.setAngularVelocity(boxA, -rotationForce);
            } else if (action === 'rotateB+') {
                Body.setAngularVelocity(boxB, rotationForce);
            } else if (action === 'rotateB-') {
                Body.setAngularVelocity(boxB, -rotationForce);
            } else {
                Body.setAngularVelocity(boxA, 0);
                Body.setAngularVelocity(boxB, 0);
            }
        }

        function updateQTable(state: string, action: string, reward: number, newState: string): void {
            const maxFutureQ = Math.max(...actions.map(a => getQ(newState, a)));
            const currentQ = getQ(state, action);
            const newQ = currentQ + alpha * (reward + gamma * maxFutureQ - currentQ);
            setQ(state, action, newQ);
        }

        function resetPosition() {
            Body.setPosition(boxA, { x: 100, y: 200 });
            Body.setPosition(boxB, { x: 185, y: 200 });
            Body.setAngle(boxA, 0);
            Body.setAngle(boxB, 0);
            Body.setVelocity(boxA, { x: 0, y: 0 });
            Body.setVelocity(boxB, { x: 0, y: 0 });
            Body.setAngularVelocity(boxA, 0);
            Body.setAngularVelocity(boxB, 0);
            episodeCount++;
        }

        let stepCount = 0;
        const maxSteps = 1000;

        // Matter.js-Update-Zyklus
        Events.on(engine, 'beforeUpdate', () => {
            const state = getState();
            const action = chooseAction(state);
            performAction(action);

            const reward = getReward();
            const newState = getState();

            updateQTable(state, action, reward, newState);

            totalReward += reward;
            averageReward = totalReward / (episodeCount + 1);
            bestReward = Math.max(bestReward, reward);

            stepCount++;

            // Check if goal is reached or max steps exceeded
            if (Matter.Collision.collides(boxA, goal) || Matter.Collision.collides(boxB, goal) || stepCount >= maxSteps) {
                resetPosition();
                stepCount = 0;
            }

            updateStatsDisplay();
        });

        function updateStatsDisplay() {
            const statsElement = document.getElementById('stats');
            if (statsElement) {
                statsElement.innerHTML = `
                    Distance to Goal: ${Math.round(distanceToGoal)}
                    <br>Episodes: ${episodeCount}
                    <br>Average Reward: ${averageReward.toFixed(2)}
                    <br>Best Reward: ${bestReward.toFixed(2)}
                    <br>Q-Table Size: ${Object.keys(qTable).length}
                `;
            }
        }

        const statsElement = document.createElement('div');
        statsElement.id = 'stats';
        statsElement.style.position = 'absolute';
        statsElement.style.top = '10px';
        statsElement.style.left = '10px';
        statsElement.style.color = 'white';
        statsElement.style.fontFamily = 'Arial, sans-serif';
        statsElement.style.fontSize = '14px';
        container.appendChild(statsElement);
    });
</script>

<div class="canvas-container">
    <div bind:this={container}></div>
</div>

<style>
    .canvas-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background-color: black;
    }

    div {
        border: 1px solid black;
    }
</style>