////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////

function setupTouchStuff(){

	document.addEventListener("touchmove", function(e){
        if(e.srcElement.className!='slider') e.preventDefault();
    }, false);

    createTester();

    setupInputs();

    setupSlidingBar();
}

////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////

var scrollingCanvas, scrollingContext, scrollingValues, latestScrollingValue;

var tester = {
    'id': -1,
    'totalOutputs': 0,
    'totalInputs': 0,
    'outputs':[],
    'inputs':[]
}

function createTester(){
    var color = testerColor;
    // create a new arc for the Tester
    outCircle.addArc('Tester',color,tester.id);
    inCircle.addArc('Tester',color,tester.id);

    tester.totalOutputs = 6; // 3 sliders, and 3 buttons
    for(var i=0;i<tester.totalOutputs;i++){
        tester.outputs[i] = {
            'value':0,
            'name':'out_'+i,
            'elem':undefined
        }
        outCircle.arcs[0].addPort(i);
        outCircle.arcs[0].ports[i].name = tester.outputs[i].name;
    }

    tester.totalInputs = 1;
    for(var i=0;i<tester.totalInputs;i++){
        tester.inputs[i] = {
            'value':0,
            'name':'in_'+i,
            'elem':undefined
        }
        inCircle.arcs[0].addPort(i);
        inCircle.arcs[0].ports[i].name = tester.outputs[i].name;
    }
}

////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////

function updateValues(index,value){
    value = Math.min(255,value);
    value = Math.max(0,value);
    tester.outputs[index].value = Math.floor(value);

    // send over WebSocket to the server, to be sent our the JeeNode
    sendTesterOutput(index,tester.outputs[index].value);
}

////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////

function setupInputs(){
    var allSliders = document.getElementsByClassName('slider');
    var allDisplays = document.getElementsByClassName('sliderDisplay');
    for(var i=0;i<allSliders.length;i++){
        allSliders[i].oninput = (function(){
            var span = allDisplays[i];
            var index = i;
            return function(){
                span.innerHTML = this.value;
                updateValues(index,this.value);
            }
        })();

        tester.outputs[i].elem = allSliders[i];
    }

    var allButtons = document.getElementsByClassName('buttonFun');
    for(var n=0;n<allButtons.length;n++){
        allButtons[n].innerHTML = '#'+(n+allSliders.length+1)
        allButtons[n].ontouchstart = (function(){
            var index = n;
            return function(e){
                e.preventDefault();
                if(allButtons[index].className.indexOf('touched')<0){
                    allButtons[index].className += ' touched';
                }
                updateValues(index+3,255);
            }
        })();
        allButtons[n].onmousedown = allButtons[n].ontouchstart;
        allButtons[n].ontouchend = (function(){
            var index = n;
            return function(e){
                e.preventDefault();
                while(allButtons[index].className.indexOf('touched')>=0){
                    allButtons[index].className = allButtons[index].className.replace('touched','');
                }
                updateValues(index+3,0);
            }
        })();
        allButtons[n].onmouseup = allButtons[n].ontouchend;

        tester.outputs[n+allSliders.length].elem = allButtons[n];
    }

    scrollingCanvas = document.getElementById('scrollingCanvas');
    scrollingCanvas.height = 255;
    scrollingCanvas.width = 100;
    scrollingContext = scrollingCanvas.getContext('2d');
    scrollingValues = [];

    for(var b=0;b<100;b++){
        scrollingValues[b] = 0;
    }

    var allCanvases = document.getElementsByClassName('canvasInput');
    for(var i=0;i<allCanvases.length;i++){
        tester.inputs[i].elem = allCanvases[i];
        tester.inputs[i].handleValue = (function(){
            var elem = tester.inputs[i].elem;
            return function(val){
                if(val<0) val=0;
                if(val>255) val=255;
                latestScrollingValue = Math.floor(val);
                drawScroller();
            }
        })();
    }
}

////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////

function drawScroller(){
    for(var b=99;b>0;b--){
        scrollingValues[b] = scrollingValues[b-1];
    }
    scrollingValues[0] = latestScrollingValue;
    scrollingContext.clearRect(0,0,scrollingCanvas.width,scrollingCanvas.height);
    scrollingContext.fillStyle = 'black';
    for(var b=0;b<100;b++){
        scrollingContext.fillRect(b,255-scrollingValues[b],1,scrollingValues[b]);
    }
}

////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////

var testerDiv;

function setupSlidingBar(){

    var maxRightPos = 0.9;

    testerDiv = document.getElementById('testerContainer');
    testerDiv.custom = {
        'offsetX':undefined,
        'xPos':maxRightPos
    };

    var sliderBar = document.getElementById('testerSlideBar');
    var hammertime = Hammer(sliderBar);
    hammertime.on("dragstart", function(event) {
        event.gesture.preventDefault();
        testerDiv.custom.offsetX = (event.gesture.center.pageX / window.innerWidth) - testerDiv.custom.xPos;
    });
    hammertime.on("dragend", function(event) {
        event.gesture.preventDefault();
        testerDiv.custom.startX = undefined;
        if(Math.abs((maxRightPos/2)-testerDiv.custom.xPos)>0.2){
            var pos = 0;
            if(testerDiv.custom.xPos>maxRightPos/2) pos = maxRightPos;
            moveTesterDiv(pos,true);
        }
    });
    hammertime.on("dragleft dragright swipeleft swiperight", function(event) {
        event.gesture.preventDefault();

        if(testerDiv.custom.offsetX){
            var thisX = event.gesture.center.pageX/window.innerWidth;
            var pos = thisX - testerDiv.custom.offsetX;

            moveTesterDiv(pos,false);
        }
    });
    hammertime.on("swipeleft swiperight", function(event) {
        event.gesture.preventDefault();
        var pos = 0;
        if(event.type==='swiperight') pos = maxRightPos;
        moveTesterDiv(pos,true);
    });

    function moveTesterDiv(relativeX,shouldTransition){
        testerDiv.custom.xPos = relativeX;
        if(testerDiv.custom.xPos<0){
            testerDiv.custom.xPos = 0;
        }
        else if(testerDiv.custom.xPos>maxRightPos){
            testerDiv.custom.xPos = maxRightPos;
        }

        if(shouldTransition){
            testerDiv.className += ' slideOver';
            testerDiv.addEventListener( 'webkitTransitionEnd',function(event){
                testerDiv.className = testerDiv.className.replace('slideOver','');
            },false);
        }
        testerDiv.style.left = Math.floor(testerDiv.custom.xPos*window.innerWidth)+'px';
    }
}

////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////