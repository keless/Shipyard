"use strict"; //ES6
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: jQuery using "jQuery()"" format, not "$()"
//#include js/framework/Service.js

var KEY_LEFT = 37;
var KEY_UP = 38;
var KEY_RIGHT = 39;
var KEY_DOWN = 40;

class Application {
	constructor( strAppName, strCanvas2DName, fnOnLoad ) {
		
		this.appName = strAppName;
		this.lastMousePos = new Vec2D();

		//setup canvas keypress handlers
		var appSelf = this;
		var jqCanvas = jQuery('#'+strCanvas2DName);
		jqCanvas.bind({
			keydown: function(e) {
			    appSelf.OnKeyDown(e);
			},
			keyup: function(e) {
				appSelf.OnKeyUp(e);
			},
			focusin: function(e) {
			    jqCanvas.addClass("selected");
					EventBus.ui.dispatch({evtName:"focus", hasFocus:true});
			},
			focusout: function(e) {
			    jqCanvas.removeClass("selected");
					EventBus.ui.dispatch({evtName:"focus", hasFocus:false});
			},
			mousedown: function(e) {
				var mouseX = e.pageX - jqCanvas.offset().left;
				var mouseY = e.pageY - jqCanvas.offset().top;
				appSelf.lastMousePos.setVal(mouseX, mouseY);
				appSelf.OnMouseDown(e, mouseX, mouseY, e.which);
			},
			mousemove: function(e) {
				var mouseX = e.pageX - jqCanvas.offset().left;
				var mouseY = e.pageY - jqCanvas.offset().top;
				appSelf.lastMousePos.setVal(mouseX, mouseY);
			},
			mouseup: function(e) {
				var mouseX = e.pageX - jqCanvas.offset().left;
				var mouseY = e.pageY - jqCanvas.offset().top;
				appSelf.lastMousePos.setVal(mouseX, mouseY);
			},
			mouseout: function(e) {
				var mouseX = e.pageX - jqCanvas.offset().left;
				var mouseY = e.pageY - jqCanvas.offset().top;
				appSelf.lastMousePos.setVal(mouseX, mouseY);
			},
			mousewheel: function(e) {
				var delta = e.originalEvent.wheelDelta;
				appSelf.OnMouseWheel(e, delta);
			}
		});
		jqCanvas.focus();
		
		//update loop vars
		this.lastUpdateTick = 0;
		this.elapsedTime = 0;
		
		Service.add("app", this);
		this.instanciateSingletons( strCanvas2DName );
		
	}
	
	instanciateSingletons( strCanvas2DName ) {
			new ResourceProvider();
			new Graphics(strCanvas2DName);
			new AudioManager();
			new Physics();
			new SaveData();
	}
	
	Play()
	{
		this._runUpdateLoop();
	}
	Pause()
	{
		this._stopUpdateLoop();
	}
	IsPaused()
	{
		return ( this.UpdateLoopInterval == null ); 
	}
	
	_runUpdateLoop() {
		if( this.UpdateLoopInterval != null ) return; //already running
		this.lastUpdateTick = (new Date()).getTime();
		this.UpdateLoopInterval = setInterval( this._updateLoop.bind(this), 30 );
	}
	_stopUpdateLoop() {
		if( this.UpdateLoopInterval == null ) return; //already stopped
		clearInterval( this.UpdateLoopInterval.bind(this) ); 
		this.UpdateLoopInterval = null;
	}
	
	_updateLoop() {
		//arguments.callee.minTickPeriod = 1;
		
		var ct = (new Date()).getTime();  //have to call new each frame to get current time
  		var dt = ct - this.lastUpdateTick;
		this.lastUpdateTick = ct;

		var dtSeconds = dt / 1000.0;
		this.elapsedTime += dtSeconds;
		
		this.OnUpdateBegin( dtSeconds, this.elapsedTime );
		
		//xxx: todo: run simulation steps
		
		var physics = Service.get("physics");
		physics.Tick();
		
		this.OnUpdateEnd( dtSeconds, this.elapsedTime );
		
		var gfx = Service.get("gfx");
		
		gfx.begin(true);
		
		this.OnDraw( gfx, dtSeconds, this.elapsedTime );
	}
	
	OnLoad() {
		console.log("override me: Application.onApplicationLoaded()");
	}
	
	/// @param: dtSeconds - delta time for current frame from last frame
	/// @param: ctSeconds - current elapsed app time in seconds
	OnUpdateBegin( dtSeconds, ctSeconds ) {
		//override me
	}
	/// @param: dtSeconds - delta time for current frame from last frame
	/// @param: ctSeconds - current elapsed app time in seconds
	OnUpdateEnd( dtSeconds, ctSeconds ) {
		//override me
	}
	
	/// @param: dtSeconds - delta time for current frame from last frame
	/// @param: ctSeconds - current elapsed app time in seconds
	OnDraw( gfx, dtSeconds, ctSeconds ) {
		//override me
	}
	
	/// @param: e - event object, read key value from e.keyCode
	OnKeyDown(e) {
		//override me
	}
	/// @param: e - event object, read key value from e.keyCode
	OnKeyUp(e) {
		//override me
	}
	OnMouseDown(e, mouseX, mouseY) {
		//override me
	}
	
	//ex: load game -- json = JSON.parse( localStorage.getItem("sudoku.save") );
	
}