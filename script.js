var block = document.getElementById("block");
var hole = document.getElementById("hole");
var character = document.getElementById("character");
var jumping = 0;
var counter = 0;
var text = document.querySelector(".text")
var score = document.querySelector(".score")
var liveScore = document.getElementById("live-score")
var highScore = document.getElementById("high-score")
highScore.innerHTML = `highest score:${JSON.parse(localStorage.getItem("scores"))}`

liveScore.innerHTML = `score:0`
hole.addEventListener('animationiteration', () => {
    var random = -((Math.random() * 300) + 150);
    hole.style.top = random + "px";
    counter++;
    liveScore.innerHTML = `score:${counter}`
    saveToLocalStorage(counter)
});
setInterval(function () {
    var characterTop = parseInt(window.getComputedStyle(character).getPropertyValue("top"));
    if (jumping == 0) {
        character.style.top = (characterTop + 3) + "px";
    }
    var blockLeft = parseInt(window.getComputedStyle(block).getPropertyValue("left"));
    var holeTop = parseInt(window.getComputedStyle(hole).getPropertyValue("top"));
    var cTop = -(500 - characterTop);
    if ((characterTop > 480) || ((blockLeft < 20) && (blockLeft > -50) && ((cTop < holeTop) || (cTop > holeTop + 130)))) {
        // Swal.fire('Any fool can use a computer')
        alert("Game over. Score: " + (counter)  + " Click to play again");
        // text.classList.remove("hide")
        // score.innerHTML+=counter-1
        character.style.top = 100 + "px";
        counter = 0;
        
    }
}, 10);

function jump() {
    jumping = 1;
    let jumpCount = 0;
    var jumpInterval = setInterval(function () {
        var characterTop = parseInt(window.getComputedStyle(character).getPropertyValue("top"));
        if ((characterTop > 6) && (jumpCount < 15)) {
            character.style.top = (characterTop - 5) + "px";
        }
        if (jumpCount > 20) {
            clearInterval(jumpInterval);
            jumping = 0;
            jumpCount = 0;
        }
        jumpCount++;
    }, 10);
}




function saveToLocalStorage(score) {
    let scores;
    if (localStorage.getItem("scores") === null) {
        scores = [];
    }
    else {
        scores = JSON.parse(localStorage.getItem("scores"));
        console.log(scores);
    }
    console.log(scores)
    if (score > scores) {
        scores = score;
    }
    localStorage.setItem("scores", JSON.stringify(scores))
}





