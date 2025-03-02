class TetrisGame {
    constructor() {
        // ... existing code ...
        this.score = 0;
        this.level = 1;
    }

    // Add this method to calculate line clear scores
    updateScore(linesCleared) {
        let points = 0;
        
        switch(linesCleared) {
            case 1:
                points = 40;
                break;
            case 2:
                points = 100;
                break;
            case 3:
                points = 300;
                break;
            case 4:
                points = 1200;
                break;
        }
        
        this.score += points * this.level;
    }

    // Add this for soft drop scoring
    addSoftDropPoints(cellsDropped) {
        this.score += cellsDropped;
    }

    // Add this for hard drop scoring
    addHardDropPoints(cellsDropped) {
        this.score += cellsDropped * 2;
    }

    updateLevel(totalLinesCleared) {
        // Increase level every 10 lines
        this.level = Math.floor(totalLinesCleared / 10) + 1;
    }

    render() {
        // ... existing code ...
        
        // Add score display
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${this.score}`, 20, 30);
        ctx.fillText(`Level: ${this.level}`, 20, 60);
    }
} 