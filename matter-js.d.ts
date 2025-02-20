declare module 'matter-js' {
    export interface Body {
        position: { x: number; y: number };
    }
    
    export namespace Body {
        function applyForce(body: Body, position: { x: number; y: number }, force: { x: number; y: number }): void;
    }
}
