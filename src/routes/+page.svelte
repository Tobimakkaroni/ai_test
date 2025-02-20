<script lang="ts">
    import { onMount } from "svelte";
    import Matter from "matter-js";

    let container: HTMLDivElement;
    let width = 1000;
    let height = 500;

    const numAgents = 50;
    const agentCategory = 0x0002;
    const worldCategory = 0x0004;
    const allCategories = 0xFFFFFFFF;

    const SAVE_KEY = "agentTrainingData";
    const SAVE_INTERVAL = 10000;

    type Agent = {
        boxA: any;
        boxB: any;
        joint: any;
        qTable: Record<string, number[]>;
        alpha: number;
        gamma: number;
        epsilon: number;
        epsilonDecayRate: number;
        distanceToGoal: number;
        episodeCount: number;
        totalReward: number;
        averageReward: number;
        bestReward: number;
        stepCount: number;
        maxSteps: number;
    };

    let distancesToGoal = Array(numAgents).fill(0);
    let episodeCounts = Array(numAgents).fill(0);
    let totalRewards = Array(numAgents).fill(0);
    let averageRewards = Array(numAgents).fill(0);
    let bestRewards = Array(numAgents).fill(-Infinity);

    onMount(() => {
        const { Engine, Render, Runner, Bodies, Composite, Constraint, Events, Body, Vector } = Matter;

        const engine = Engine.create();
        let generationCounter = 0;
        const generationInterval = 5;
        let saveTimer = 0;

        const savedData = localStorage.getItem(SAVE_KEY);
        const initialAgents = savedData ? JSON.parse(savedData) : null;

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

        const wallL = Bodies.rectangle(0, 290, 50, 300, {
            isStatic: true,
            collisionFilter: { category: worldCategory, mask: agentCategory },
            render: {
                fillStyle: '#FF0000',
                strokeStyle: '#000000',
                lineWidth: 2
            }
        });
        const wallR = Bodies.rectangle(1000, 290, 50, 300, {
            isStatic: true,
            collisionFilter: { category: worldCategory, mask: agentCategory },
            render: {
                fillStyle: '#FF0000',
                strokeStyle: '#000000',
                lineWidth: 2
            }
        });
        const goal = Bodies.circle(950, 400, 20, {
            isStatic: true,
            collisionFilter: { category: worldCategory, mask: agentCategory },
            render: {
                fillStyle: '#46ff33',
                strokeStyle: '#000000',
                lineWidth: 2
            }
        });
        const obstacle = Bodies.rectangle(500, 415, 50, 50, {
            isStatic: true,
            collisionFilter: { category: worldCategory, mask: agentCategory },
            render: {
                fillStyle: '#FFFFFF',
                strokeStyle: '#000000',
                lineWidth: 2
            }
        });
        const ground = Bodies.rectangle(width / 2, height - 30, width, 60, {
            isStatic: true,
            collisionFilter: { category: worldCategory, mask: agentCategory }
        });

        Composite.add(engine.world, [ground, wallL, wallR, goal, obstacle]);

        const agents: Agent[] = Array.from({ length: numAgents }, (_, i) => {
            const boxA = Bodies.rectangle(100, 200, 80, 20, {
                friction: 0.5,
                collisionFilter: { category: agentCategory, mask: worldCategory },
                render: { visible: false }
            });
            const boxB = Bodies.rectangle(185, 200, 80, 20, {
                friction: 0.5,
                collisionFilter: { category: agentCategory, mask: worldCategory },
                render: { visible: false }
            });

            const joint = Constraint.create({
                bodyA: boxA,
                bodyB: boxB,
                pointA: { x: 50, y: 0 },
                pointB: { x: -50, y: 0 },
                length: 0,
                stiffness: 0.9,
                angularStiffness: 0.1,
            });

            Composite.add(engine.world, [boxA, boxB, joint]);

            return {
                boxA,
                boxB,
                joint,
                qTable: initialAgents?.[i]?.qTable || {},
                alpha: initialAgents?.[i]?.alpha || 0.1,
                gamma: initialAgents?.[i]?.gamma || 0.8,
                epsilon: initialAgents?.[i]?.epsilon || 0.3,
                epsilonDecayRate: 0.0005,
                distanceToGoal: 0,
                episodeCount: initialAgents?.[i]?.episodeCount || 0,
                totalReward: initialAgents?.[i]?.totalReward || 0,
                averageReward: 0,
                bestReward: initialAgents?.[i]?.bestReward || -Infinity,
                stepCount: 0,
                maxSteps: 2400
            };
        });

        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        const angleDivisions = 24;
        const positionDivisions = 16;
        const actions = ['rotateA+', 'rotateA-', 'rotateB+', 'rotateB-', 'none'];

        function getState(agent: Agent): string {
            return JSON.stringify({
                angleA: Math.round(agent.boxA.angle / (2 * Math.PI) * angleDivisions),
                angleB: Math.round(agent.boxB.angle / (2 * Math.PI) * angleDivisions),
                positionA: {
                    x: Math.round(agent.boxA.position.x / width * positionDivisions),
                    y: Math.round(agent.boxA.position.y / height * positionDivisions)
                },
                positionB: {
                    x: Math.round(agent.boxB.position.x / width * positionDivisions),
                    y: Math.round(agent.boxB.position.y / height * positionDivisions)
                }
            });
        }

        function getQ(agent: Agent, state: string, action: string): number {
            if (!agent.qTable[state]) agent.qTable[state] = actions.map(() => 0);
            return agent.qTable[state][actions.indexOf(action)];
        }

        function setQ(agent: Agent, state: string, action: string, value: number): void {
            if (!agent.qTable[state]) agent.qTable[state] = actions.map(() => 0);
            agent.qTable[state][actions.indexOf(action)] = value;
        }

        function getReward(agent: Agent): number {
            const distance = Vector.magnitude(Vector.sub(goal.position, agent.boxB.position));
            agent.distanceToGoal = distance;

            let reward = -distance * 0.1;

            if (Matter.Collision.collides(agent.boxA, goal) || Matter.Collision.collides(agent.boxB, goal)) {
                reward = 100;
            }

            return reward;
        }

        function chooseAction(agent: Agent, state: string): string {
            if (Math.random() < agent.epsilon) {
                return actions[Math.floor(Math.random() * actions.length)];
            } else {
                const stateQ = agent.qTable[state] || actions.map(() => 0);
                return actions[stateQ.indexOf(Math.max(...stateQ))];
            }
        }

        function performAction(agent: Agent, action: string): void {
            const rotationForce = 0.01;

            if (action === 'rotateA+') {
                Body.setAngularVelocity(agent.boxA, rotationForce);
            } else if (action === 'rotateA-') {
                Body.setAngularVelocity(agent.boxA, -rotationForce);
            } else if (action === 'rotateB+') {
                Body.setAngularVelocity(agent.boxB, rotationForce);
            } else if (action === 'rotateB-') {
                Body.setAngularVelocity(agent.boxB, -rotationForce);
            } else {
                Body.setAngularVelocity(agent.boxA, 0);
                Body.setAngularVelocity(agent.boxB, 0);
            }
        }

        function updateQTable(agent: Agent, state: string, action: string, reward: number, newState: string): void {
            const maxFutureQ = Math.max(...actions.map(a => getQ(agent, newState, a)));
            const currentQ = getQ(agent, state, action);
            const newQ = currentQ + agent.alpha * (reward + agent.gamma * maxFutureQ - currentQ);
            setQ(agent, state, action, newQ);
        }

        function resetPosition(agent: Agent) {
            const i = agents.indexOf(agent);
            Body.setPosition(agent.boxA, { x: 100, y: 200 });
            Body.setPosition(agent.boxB, { x: 185, y: 200 });
            Body.setAngle(agent.boxA, 0);
            Body.setAngle(agent.boxB, 0);
            Body.setVelocity(agent.boxA, { x: 0, y: 0 });
            Body.setVelocity(agent.boxB, { x: 0, y: 0 });
            Body.setAngularVelocity(agent.boxA, 0);
            Body.setAngularVelocity(agent.boxB, 0);
            agent.episodeCount++;
            agent.epsilon = Math.max(0.01, agent.epsilon - agent.epsilonDecayRate);
        }

        function updateAgentVisibility(agents: Agent[]) {
            const sortedAgents = [...agents].sort((a, b) => b.averageReward - a.averageReward);
            const topAgents = sortedAgents.slice(0, 3);

            agents.forEach(agent => {
                const isTop = topAgents.includes(agent);
                agent.boxA.render.visible = isTop;
                agent.boxB.render.visible = isTop;
            });
        }

        function saveProgress(agents: Agent[]) {
            const saveData = agents.map(agent => ({
                qTable: agent.qTable,
                alpha: agent.alpha,
                gamma: agent.gamma,
                epsilon: agent.epsilon,
                episodeCount: agent.episodeCount,
                totalReward: agent.totalReward,
                bestReward: agent.bestReward
            }));
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        }

        Events.on(engine, 'beforeUpdate', () => {
            generationCounter++;
            saveTimer++;

            agents.forEach((agent, index) => {
                const state = getState(agent);
                const action = chooseAction(agent, state);
                performAction(agent, action);

                const reward = getReward(agent);
                const newState = getState(agent);

                updateQTable(agent, state, action, reward, newState);

                agent.totalReward += reward;
                agent.averageReward = agent.totalReward / (agent.episodeCount + 1);
                agent.bestReward = Math.max(agent.bestReward, reward);
                distancesToGoal[index] = agent.distanceToGoal;
                episodeCounts[index] = agent.episodeCount;
                totalRewards[index] = agent.totalReward;
                averageRewards[index] = agent.averageReward;
                bestRewards[index] = agent.bestReward;

                agent.stepCount++;

                if (Matter.Collision.collides(agent.boxA, goal) || Matter.Collision.collides(agent.boxB, goal) || agent.stepCount >= agent.maxSteps) {
                    resetPosition(agent);
                    agent.stepCount = 0;
                }
            });

            updateStatsDisplay();
            updateAgentVisibility(agents);

            if (saveTimer >= SAVE_INTERVAL) {
                saveProgress(agents);
                saveTimer = 0;
            }

            if (generationCounter >= generationInterval) {
                let bestAgent = agents.reduce((best, current) =>
                    current.averageReward > best.averageReward ? current : best, agents[0]);

                agents.forEach(agent => {
                    if (agent !== bestAgent) {
                        agent.qTable = JSON.parse(JSON.stringify(bestAgent.qTable));
                        for (const state in agent.qTable) {
                            agent.qTable[state] = agent.qTable[state].map((q: number) =>
                                q + (Math.random() * 0.2 - 0.1) // ±0.1 noise
                            );
                        }
                        agent.epsilon = Math.min(agent.epsilon + 0.2, 0.5);
                    }
                });

                generationCounter = 0;
            }
        });

        window.addEventListener('beforeunload', () => saveProgress(agents));

        function updateStatsDisplay() {
            const statsElement = document.getElementById('stats');
            if (statsElement) {
                statsElement.innerHTML = `
                    Avg Distance to Goal: ${distancesToGoal.reduce((a, b) => a + b, 0) / numAgents}
                    <br>Avg Episodes: ${episodeCounts.reduce((a, b) => a + b, 0) / numAgents}
                    <br>Avg Average Reward: ${averageRewards.reduce((a, b) => a + b, 0) / numAgents}
                    <br>Avg Best Reward: ${bestRewards.reduce((a, b) => a + b, 0) / numAgents}
                    <br>Q-Table Sizes: ${agents.map(agent => Object.keys(agent.qTable).length).join(', ')}
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