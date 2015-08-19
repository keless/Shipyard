"use strict"; //ES6
//#include https://code.jquery.com/ui/1.11.0/jquery-ui.min.js
//NOTE: jQuery using "jQuery()"" format, not "$()"
//#include js/framework/Service.js


class SpaceZoneModel {
	constructor() {
		
		this.entities = [];
		this.projectiles = [];
		this.floatingParts = [];
		this.controllers = [];

		this.zoomLevel = 0.5;

		this.isLoaded = false;
		
		this.gameTime = 0;
		
		this.userShip = null;
		
		//this will be updated by the VIEW, we can use it  
		// when calculating mouse position in world coordinates
		this.cameraOffset = new Vec2D();
		
		this.createUserShip();
		
		this.SetListener(EventBus.game, "fireWeapon", this.onFireWeapon);
		this.SetListener(EventBus.game, "destroyProjectile", this.onDestroyProjectile);
		this.SetListener(EventBus.game, "shipDestroyed", this.onShipDestroyed);
		this.SetListener(EventBus.game, "floatPart", this.onFloatPart);
	} 
	
	Destroy() {
		var app = Service.get("app");
		app.state.userInventory.activeShip = this.entities[0].toJson();
		
		this.DestroyListeners();
	}

	SetListener(bus, evtName, fn) {
		if(!this._listeners) {
			this._listeners = [];
		}
		bus.addListener(evtName, fn.bind(this));
		this._listeners.push({bus:bus, evt:evtName, fn:fn});
	}
	DestroyListeners() {
		for(var l of this._listeners) {
			l.bus.removeListener(l.evt, l.fn);
		}
	}

	onFireWeapon(e) {
		this.fireWeapon(e.weapon, e.fromShip, e.params);
	}

	fireWeapon(weapon, fromShip, params)
	{
		//todo: validate 'fromship' is in this.entities
		var weapPosRot = weapon.rGetShipRelativePosAndRot();
		
		switch(weapon.partJson.weapCat) {
			case "lazer":
				console.log("pew pew");
			break;
			case "missile":
				//console.log("fire ze meesiel");
				var missile = new Projectile( fromShip );
				//TODO: currently projectile == launcher, need to decouple these
				missile.pos = fromShip.pos.getVecAdd( weapPosRot.pos.getVecRotation( fromShip.rotation ) );
				missile.rotation = fromShip.rotation + weapPosRot.rotation;
				missile.vel.setVal(0, -1200); //TODO: replace hardcoded 1200 m/s velocity
				missile.vel.rotate( missile.rotation );
				missile.vel.addVec( fromShip.vel );
				
				missile.setPartJson( weapon.partJson );
				missile.setEndTime( this.gameTime + 5 ); //TODO: replace hardcoded '5' seconds of life
				missile.view = ShipView.CreatePartView( missile );
				this.projectiles.push(missile);
			break;
		}
	}
	
	onDestroyProjectile(e) {
		this.destroyProjectile(e.projectile);
	}
	
	destroyProjectile( projectile ) {
		var idx = this.projectiles.indexOf(projectile);
		if(idx >= 0) {
			this.projectiles[idx].Destroy();
			this.projectiles.splice(idx,1);
		}
	}
	
	onShipDestroyed(e) {
		this.destroyShip(e.ship);
	}
	
	destroyShip( ship ) {
		if(ship == this.userShip) {
			console.log("warning: removing userShip -- someone needs to let the controller know!!")
		}
		
		for(var i=0; i<this.entities.length; i++) {
			if(this.entities[i] == ship) {
				this.entities.splice(i, 1);
				return;
			}
		}
		
	}
	
	onFloatPart(e) {
		this.floatPart(e.part);
	}
	
	floatPart( part ) {
		part.view = ShipView.CreatePartView(part);
		this.floatingParts.push(part);
	}

	getPointsOfInterest(ofType) {
		var pts = [];
		switch(ofType) {
			case "ship":
				for( let e of this.entities ) {
					pts.push(e.pos.clone());
				}
			break;
			case "station":
			break;
			case "projectile":
				for( let p of this.projectiles ) {
					pts.push(p.pos.clone());
				}
			break;
			case "cargo":
			break;
		}
		return pts;
	}
	
	AddEntity( entity ) {
		this.entities.push(entity);
	}
	
	RemoveEntity( entity ) {
		var i = this.entities.indexOf(entity);
		if(i != -1) {
			this.entities.splice(i, 1);
		}
	}
	
	Zoom( delta ) {
		var zoomRate = 0.025;
		if(delta > 0) {
			if( this.zoomLevel < 1.0 ) {
				this.zoomLevel += zoomRate;
			}
		} else {
			if( this.zoomLevel > 0.2 ) {
				this.zoomLevel -= zoomRate;
			}
		}
	}
	
	//translate from window pixel coordinates to world unit coordinates
	getNumberInWorldCoords( float ) {
		return float / this.zoomLevel;
	}
	//translate from window pixel coordinates to world unit coordinates
	getVecInWorldCoords( vec2d ) {
		return vec2d.getScalarMult( 1 / this.zoomLevel );
	}
	
	Update( dt, ct ) {
		this.gameTime = ct;
		
		let ship = this.entities[0];
		if(ship) {
			var app = Service.get("app");
			var worldMouse = this.getVecInWorldCoords(app.lastMousePos);
			worldMouse.subVec(this.cameraOffset);
			let vecToMouse = worldMouse.getVecSub(ship.pos);
			ship.controller.rotationTarget = vecToMouse;
		}
		
		for(let controller of this.controllers) {
			controller.Update(dt, ct);
		}

		for(let e of this.entities) {
			e.Update(dt, ct);
		}
		
		for(let p of this.floatingParts) {
			p.pos.addVec( p.vel.getScalarMult(dt) );
			p.view.pos.setVec( p.pos );
			
			p.rotation += p.angularVel * dt;
			p.view.rotation = p.rotation;
		}
		
		for(let p of this.projectiles ) {
			p.Update(dt, ct);
			
			//detect projectile->entity collisions
			for(let e of this.entities) {
				if(p.fromShip == e) continue;
				if( e.getAABB().isPointInside( p.pos ) ) {
					//collision with AABB detected now search for actual part hit
					
					var part = e.getPartAtPoint(p.pos);
					if( part ) {
						//console.log("aabb collision")
						console.log("hit part " + part.type);
						EventBus.game.dispatch({evtName:"explosion", pos:p.pos.clone(), ct:ct });
						this.destroyProjectile(p);
						e.handleDamageToPart( part.uid, 5 ); //HACK: hardcoded '5' damage
					}
				}
			}
		}
	}
	
	dbgLoseEngine() {
		var ship = this.userShip;
		ship.dbgLoseEngine();
		ship.controller.updateThrustControllers();
	}
	
	createUserShip() {
		var app = Service.get("app");
		
		var ship = new ShipModel();
		ship.fromJson(app.state.userInventory.activeShip);
		this.entities.push(ship);
		this.userShip = ship;
		ship.pos.setVal(0,0);
		//ship.rotation = Math.PI/3;
		
		//set up controller for user ship
		ship.controller = new ShipController(ship);
		ship.controller.updateThrustControllers();
		this.controllers.push(ship.controller);
		
		//build the view component
		//ship1.dbgBuildView();
		ship.view = ShipView.CreateShipView(ship);
		
		var blueprints = Service.get("sd").load("blueprints");
		var bpKeys = Object.keys(blueprints);
		var blueprintName = bpKeys[getRand(0, bpKeys.length-1)];
		//var blueprintJson = blueprints[ blueprintName ].parts;
		var targetJson = {"type":"f1", "category":"frame", children:[
				{"type":"t1", "category":"thruster", pos:{x:-25,y:50}},
				{"type":"t1", "category":"thruster", pos:{x:0,y:-100}, rotation:Math.PI},
				{"type":"t1", "category":"thruster", pos:{x:25,y:50}},
				{"type":"f1", "category":"frame", pos:{x:0,y:0}, rotation:Math.PI/2}
			]};
		//add targets to fill out the space
		{
			ship = new ShipModel();
			ship.fromJson( blueprints[blueprintName].parts ); //targetJson );
			ship.pos.setVal( 1000,-200 );
			ship.rotation = Math.PI/2;
			this.entities.push(ship);
			ship.view = ShipView.CreateShipView(ship);
		}
		/*
		{
			ship = new ShipModel();
			ship.fromJson( targetJson );
			ship.pos.setVal( -5000,-2000 );
			this.entities.push(ship);
			ship.view = ShipView.CreateShipView(ship);
		}
		{
			ship = new ShipModel();
			ship.fromJson( targetJson );
			ship.pos.setVal( 5000,2000 );
			this.entities.push(ship);
			ship.view = ShipView.CreateShipView(ship);
		}
		//*/
	}
	
}