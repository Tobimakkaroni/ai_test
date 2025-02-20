Basics:
        Reinforcement Learning
        Evolutionäre Algorithmen

Simulation aufbauen:
        Physik Engines nutzen wie:
            Matter.js

ML im Browser:
        TensorFlow.js

Fitnessfunktionen:
        z.B. Distanz messen von Punk A zu B
            --> belohnt schnellere und effizientere Bewegungen

Generationen & Optimierung:
        Genetischer Algorithmus oder Reinforcement Learning um mehrere Generationen stätig zu verbessern

Grenzen definieren:
        Zeitlimits, Scorelimits

====================================================

1. Projekt aufsetzten
2. Physik engine wählen (matter.js, planck.js)
3. Umgebung erstellen
4. Reinforcement learning implementieren.
    : Q-Learning
        Zustände definieren
        Aktionen und Fitnessfunktion (z.b. distanz zum ziel)
        alternativ tensorflow um neuronales netz zu trainieren
5. Training und Interation
    Agenten in mehreren Episoden lernen lassen
6. Weiter mit genetischen Algorithmen


===================================================

Wie erstellt man mit Matter.js einen Körper mit Hitbox?

const box = Matter.Bodies.rectangle(x, y, width, height);
Matter.World.add(engine.world, [box]);


Q-Learning:

Zustände und Aktionen:
Definieren was der Agent wahrnimmt (z.b. position) und welche aktionen er ausführen kann (links, rechts usw.)

Q-Tabelle:
Tabelle als Array erstellen die jedem Zustand eine Bewertung für jede Aktion zuweist

Update Regel:
Q(s,a) = Q(s,a) + alpha * (reward + y * max(Q(s',:)) - Q(s,a))


Genetische Algorithmen als Alternative:

Population von zufälligen Strategien erstellen (parameterwerte für bewegungen)
Jede strategie mit fitnessfunktion bewerten (schnelligkeite zb.)
beste strategie auswählen und mutationen einfügen für neue strategien


Tensorflow.js für deep reinforcement learning:

tensorflow.js installieren
einfaches modell bauen aus ein paar dense layers und q-werte für jeden zustand ausgeben

trainieren mit gesammelten daten aus simulationen
(tutorials angucken)

=====================================================

gravitation einfügen (matter.js)

const engine = Matter.Engine.create();
engine.world.gravity.y = 1; // 1 ist beispielwert

===================================================

wahrnehmung des agenten erstellen:

zustandsvektor erstellen
ist ein objekt oder array welcher alle wichtigen informationen der aktuellen situation enthält
zb:
position x und y koordinaten
geschwindigkeit: wie schnell und in welche richtung er sich bewegt (vx, vy)
relative position zum ziel: differenz zwischen agenten und zielposition (dx, dy)
winkel und orientierung (optional)
weitere sensorwerte wie kollisionserkennung, abstände zu hindernissen

bsp:

const state = {
    position: { x: agent.x, y: agent.y },
    velocity: { vx: agent.vx, vy: agent.vy },
    targetDelta: { dx: target.x - agent.x, dy: target.y - agent.y }
    // weitere werte
}

