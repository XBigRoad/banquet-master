/**
 * ========================================
 * Banquet Master v7.0 - Utility Functions
 * ========================================
 */

const U = {
    // Generate unique ID
    id: () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    
    // Round to 2 decimal places
    round: (n) => Math.round(n * 100) / 100,
    
    // Find index of minimum positive value in array
    minIdx: (arr) => {
        let min = Infinity, idx = -1;
        arr.forEach((v, i) => {
            const n = parseFloat(v) || 0;
            if (n > 0 && n < min) { min = n; idx = i; }
        });
        return idx;
    }
};
