"use strict"; //ES6

var bShowDebug = false;

class Config {
	static get areSpritesCentered() {
		return true;
	}
}

var game_create = function()
{
	ShipPartCatalog.setSource( data.shipParts );

	var app = new Application("FuzzPop", "content");
	window.app = app;
	
	app.state = new GameStateController();
	app.state.gotoState(GameStateController.STATE_LOADING);
	
	EventBus.ui.addListener("loadingComplete", function(e){
		app.state.gotoState(GameStateController.STATE_HANGAR); //STATE_FLYING
		EventBus.ui.removeListener("loadingComplete", this);
	});
	
	app.OnDraw = function( g, dtSeconds, ctSeconds ) {
		if(app.state.view) {
			app.state.view.Draw(g, 0, 0, ctSeconds);
		}
	};
	
	app.OnUpdateBegin = function( dt, ct ) {
		if(app.state.model) {
			app.state.model.Update(dt,ct);
		}
	}
	
	app.OnMouseDown = function(e, x, y) {
		//which button?
		app.state.view.OnMouseDown(e,x,y);
	}
	
	app.OnMouseWheel = function(e, delta) {
		if(app.state.view.OnMouseWheel) {
			app.state.view.OnMouseWheel(e, delta);
		}
	}
		
	//* todo
	app.OnKeyDown = function(e) {
		app.state.view.OnKeyDown(e, app.lastMousePos.x, app.lastMousePos.y);
	};
	
	app.OnKeyUp = function(e) {
		app.state.view.OnKeyUp(e, app.lastMousePos.x, app.lastMousePos.y);
	};
	//*/
	
	app.Play();
};
