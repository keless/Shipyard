"use strict"; //ES6

class SpaceZoneView extends BaseStateView {
	constructor( spaceZoneModel ) {
		super();
		this.model = spaceZoneModel;
		
		this.screenSize = new Vec2D();
		
		this.psExplosions = new ParticleSystem( 50 );
		
		//add button to switch to hangar state
		var RP = Service.get("rp");
		var sprBtnBlue = RP.getSprite("gfx/btn_blue.sprite");
		this.btnHangar = new ButtonView("navHangar", sprBtnBlue, "HANGAR", "14px Arial", "#FFFF00");
		this.btnHangar.pos.setVal(500, 50);
		this.SetListener(EventBus.ui, "navHangar", this.gotoHangar);
		this.SetListener(EventBus.game, "explosion", this.onExplosion);
	}
	
	onExplosion(e) {
		var RP = Service.get("rp");
		var sprite = RP.getSprite("gfx/explosion_1.sprite");
		this.psExplosions.spawnAnimated(e.pos.x, e.pos.y, 0,0, e.ct, sprite );
	}
	
	gotoHangar() {
		EventBus.game.dispatch({evtName:"gotoState", state:GameStateController.STATE_HANGAR});
	}
	
	OnMouseDown(e, x,y) {
		//check to see if the hangar nav button was pressed
		this.btnHangar.OnMouseDown(e,x,y);
	}
	
	OnMouseWheel(e, delta) {
		this.model.Zoom(delta);
	}
	
	OnKeyDown(e, x,y) {
		let ship = this.model.userShip;
		if(ship) {
			switch(e.keyCode) {
				case KEY_RIGHT: 
					if(ship) ship.controller.joystick.r = true; 
					break;
				case KEY_LEFT: 
					if(ship) ship.controller.joystick.l = true; 
					break;
				case KEY_UP: 
					if(ship) ship.controller.joystick.d = true; 
					break;
				case KEY_DOWN: 
					if(ship) ship.controller.joystick.u = true; 
					break;
				case 'X'.charCodeAt(0):
					if(ship) ship.controller.joystick.applyBreaks = true;
					break;
					
				case 'P'.charCodeAt(0):
					if(ship) {
						console.log("catastrophy! engine exploded! ohnoes")
						this.model.dbgLoseEngine();
					}
					break;
					
					//number 1,2,3,4
				case 49: if(ship) ship.controller.joystick.a1 = true; break;
				case 50: if(ship) ship.controller.joystick.a2 = true; break;
				case 51: if(ship) ship.controller.joystick.a3 = true; break;
				case 52: if(ship) ship.controller.joystick.a4 = true; break;
					
					//*
				case 'S'.charCodeAt(0):
					if(ship) ship.controller.joystick.l = true; 
					break;
				case 'D'.charCodeAt(0):
					if(ship) ship.controller.joystick.d = true; 
					break;
				case 'F'.charCodeAt(0):
					if(ship) ship.controller.joystick.r = true; 
					break;
				case 'E'.charCodeAt(0):
					if(ship) ship.controller.joystick.u = true; 
					break;
					//*/
			}
		}
	}
	
	OnKeyUp(e, x,y) {
		let ship = this.model.userShip;
		switch(e.keyCode) {
			case KEY_RIGHT: 
				if(ship) ship.controller.joystick.r = false; 
				break;
			case KEY_LEFT: 
				if(ship) ship.controller.joystick.l = false; 
				break;
			case KEY_UP: 
				if(ship) ship.controller.joystick.d = false; 
				break;
			case KEY_DOWN: 
				if(ship) ship.controller.joystick.u = false; 
				break;
				
			case 'X'.charCodeAt(0):
				if(ship) ship.controller.joystick.applyBreaks = false;
				break;
				
			case 49: if(ship) ship.controller.joystick.a1 = false; break;
			case 50: if(ship) ship.controller.joystick.a2 = false; break;
			case 51: if(ship) ship.controller.joystick.a3 = false; break;
			case 52: if(ship) ship.controller.joystick.a4 = false; break;
				
				//*
			case 'S'.charCodeAt(0):
				if(ship) ship.controller.joystick.l = false; 
				break;
			case 'D'.charCodeAt(0):
				if(ship) ship.controller.joystick.d = false; 
				break;
			case 'F'.charCodeAt(0):
				if(ship) ship.controller.joystick.r = false; 
				break;
			case 'E'.charCodeAt(0):
				if(ship) ship.controller.joystick.u = false; 
				break;
				//*/
		}
	}
	
	Draw( g, x,y, ct) {
		this.screenSize.setVal( g.getWidth(), g.getHeight() );
		var model = this.model;
		
		//fill background
		g.drawRectEx(this.screenSize.x/2, this.screenSize.y/2, this.screenSize.x, this.screenSize.y, "#000000");
		
		//BEGIN SCALED WORLD RENDERING
		g.saveMatrix();
		g.scale(this.model.zoomLevel);
		
		//center user in camera
		// PHASE 1 - locked position
		var visibleWorldSize = this.model.getVecInWorldCoords(this.screenSize);
		model.cameraOffset.setVec( visibleWorldSize.getScalarMult(0.5) );
		if(model.userShip) {
			model.cameraOffset.x -= model.userShip.pos.x;
			model.cameraOffset.y -= model.userShip.pos.y;
		}
		g.translate( model.cameraOffset.x, model.cameraOffset.y);

		// PHASE 2 - camera window?
		
		for(let p of model.projectiles ) {
			p.view.draw(g, x,y, ct);
		}
		
		for(let entity of model.entities ) {
			entity.view.draw(g, x,y, ct);
			
			let start = entity.view.pos.clone();
			let end = start.getVecAdd(entity.vel);
			g.drawLineEx(start.x, start.y, end.x, end.y, "#FF0000")
		}
		
		for(let p of model.floatingParts ) {
			p.view.draw(g, x,y, ct);
		}
		
		this.psExplosions.draw(g, x,y, ct);
		
		var app = Service.get("app");
		//draw line from ship COM to mouse pos
		let worldMouse = model.getVecInWorldCoords(app.lastMousePos);
		worldMouse.subVec(model.cameraOffset);
		if(model.userShip) {
			let ship = model.userShip;
			let cpos = ship.getCoMPosWorld();
			g.drawLineEx(cpos.x, cpos.y, worldMouse.x, worldMouse.y, "#FF0000");
		}
		//draw mouse pos
		g.drawCircle(worldMouse.x, worldMouse.y, 6);
		
		g.restoreMatrix();
		//END SCALED WORLD RENDERING
		
		//draw carrots
		var visibleWorldArea = new Rect2D(-model.cameraOffset.x, -model.cameraOffset.y, visibleWorldSize.x, visibleWorldSize.y);
		var shipPoints = this.model.getPointsOfInterest("ship");
		for(let p of shipPoints) {
			if( p.equalsVec(model.userShip.pos) ) continue;
			if( visibleWorldArea.isPointInside(p) ) continue;
			
			//clamp position
			if(p.x < visibleWorldArea.x) p.x = 0;
			else if(p.x > visibleWorldArea.x + visibleWorldArea.w ) p.x = visibleWorldArea.w;
			else p.x -= visibleWorldArea.x;
			if(p.y < visibleWorldArea.y ) p.y = 0;
			else if(p.y > visibleWorldArea.y + visibleWorldArea.h ) p.y = visibleWorldArea.h;
			else p.y -= visibleWorldArea.y;
			
			//scale from world to screen
			p.x = p.x * ( this.screenSize.x / visibleWorldArea.w );
			p.y = p.y * ( this.screenSize.y / visibleWorldArea.h );
			
			//draw carrot
			g.drawCircle(p.x, p.y, 4);
		}
				
		if(model.userShip) {
			let ship = model.userShip;
			//write text vel string
			g.drawText("vel " + ship.vel.toString(), g.getWidth()/2, g.getHeight() - 50 );

			//g.drawText("tRot " + ship.controller.dbgDesiredRotation.toFixed(6), g.getWidth()/2, 50 );
			//g.drawText("aVel " + ship.angularVel.toFixed(6), g.getWidth()/2, 100 );
			
	//		g.drawText("relVel " + ship.controller.dbgRelativeVel.toString(), g.getWidth()/2, 50 );
			
		}
		

		
		this.btnHangar.draw(g, 0,0, ct);
		
	}
}