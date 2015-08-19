"use strict"; //ES6
//#include js/framework/Vec2D.js

class Projectile {
	constructor( fromShip, uid ) {
		this.view = null;
		this.fromShip = fromShip;
		this.uid = uid || uuid.v4(); //generate a new UUID if not given
		this.partJson = null;
		this.pos = new Vec2D();
		this.vel = new Vec2D();
		this.rotation = 0;
		
		this.endTime = 0;
	}
	
	Destroy() {
		
	}
	
	get imageName() {
		return this.partJson.imageName;
	}
	
	get category() {
		return "weapon";
	}
	
	setPartJson( json ) {
		this.partJson = json;
	}
	
	setEndTime( t ) {
		this.endTime = t;
	}
	
	Update( dt, ct ) {
		this.pos.addVec( this.vel.getScalarMult(dt) );
		
		if( ct >= this.endTime ) {
			EventBus.game.dispatch({evtName:"destroyProjectile", projectile:this});
		}
		
		if(this.view) {
			//update view
			this.view.rotation = this.rotation;
			this.view.pos.setVec(this.pos);
		}
	}
}

class ShipModel {
	constructor( ) {
		//in this case, the model to owns the view since it often rebuilds it
		this.view = null;

		//actuators
		 //todo: make parts a tree heirarchy like NodeView is
		this.frame = null; //tree heirarchy of parts
		this.thrusters = []; //array of thrusters (from the children of frame)

		//physics
		this.pos = new Vec2D();
		this.vel = new Vec2D();
		this.rotation = 0; //NOTE: rotation around CoM world position NOT this.pos!!
		this.angularVel = 0;
		this.CoM = {
			pos: new Vec2D(),
			mass: 0
			};
		//
		this.AABB = {self:null, total:null};
			
		this.angularDampening = 0.5;

		this.linearAccelExt = new Vec2D();
		this.linearAccelThrusters = new Vec2D();
		this.angularAccelExt = 0;
		this.angularAccelThrusters = 0;
	}
	
	calculateEverything()
	{
		this.calculateCoM();
		this.preCacheAcceleration();
		this.preCacheAABB();
	}
	
	//currently doesnt care about position/vel/accel, and just calls root part toJson()
	toJson() {
		if(this.frame) {
			return this.frame.toJson();
		}else {
			return {};
		}
		
	}
	fromJson(json) {
		this.frame = new ShipPartModel();
		this.frame.fromJson(json);
		
		this.calculateEverything();
	}
	
	getTotalMass() {
		return this.CoM.mass;
	}
	
	//returns dictionary [ partType ] : qty
	getPartsList() {
		return this.frame.getPartQtys();
	}
	
	getWeapons() {
		return this.frame.getWeapons();
	}
	

	getAABB() {
		var worldAABB = this.AABB.total.clone().addVecOffset(this.pos);
		return Rect2D.getInscribedRotatedRect( worldAABB, this.frame.rotation + this.rotation );
	}
	
	getPartAtPoint( p ) {
		//make p ship-relative
		var localP = p.getVecSub( this.pos );
		localP.rotate( -this.rotation );
		return this.rGetPartAtPoint(localP, this.AABB);
	}
	rGetPartAtPoint( p, bbObj ) {
		//make point part-relative
		var localP = p.getVecSub( bbObj.part.pos );
		localP.rotate(-bbObj.part.rotation);
		
		//first test total box
		if(!bbObj.total.isPointInside(localP)) return null;
		
		//next test children
		if(bbObj.self.children) {
			for(let cbbObj of bbObj.self.children)	{
				var part = this.rGetPartAtPoint(localP, cbbObj);
				if(part) return part;
			}
		}
		//else test current part
		if( bbObj.self.isPointInside(localP) ) {
			return bbObj.part;
		}
		return null;
	}
	
	preCacheAABB() {
		//TODO: ensure AABB (not rotated)
		if(this.frame) {
			this.AABB = this.frame.rGetBoundingBox();
		}else {
			this.AABB = {self:null, total:null};
		}
		
	}
	
	preCacheAcceleration() {
		if(this.frame) {
			this.thrusters = this.frame.getThrusters();
		}else {
			this.thrusters = [];
		}
		
		let angularDamp = this.angularDampening;
		
		var minA = 0; var maxA = 0;
		var minX = 0; var maxX = 0;
		var minY = 0; var maxY = 0;
		
		if(this.verbose) console.log("--- pre cache accel ---")
		for(let thruster of this.thrusters) {

			var thrustAmt = 1.0 * thruster.maxThrust;
			
			//get the thruster's ship relative transform
			var p = thruster.rGetShipRelativePosAndRot();   //BUG? everything relative to ship center, not CoM??

			var thrustEpsilon = 0.00001;

			//get ship-realtive thrust vector
			var linearThrust = Vec2D.getVecFromRadians(p.rotation); //unit
			linearThrust.scalarMult(thrustAmt);
			if(Math.abs(linearThrust.x) < thrustEpsilon) linearThrust.x = 0;
			if(Math.abs(linearThrust.y) < thrustEpsilon) linearThrust.y = 0;
			
			if(linearThrust.x < 0) minX += linearThrust.x;
			else maxX += linearThrust.x;
			if(linearThrust.y < 0) minY += linearThrust.y;
			else maxY += linearThrust.y;
		
			//get angular amt
			var rotationToThruster = p.pos.getVecSub( this.CoM.pos ).toRadians();
			if(this.verbose) console.log(" rotation to thruster " + rotationToThruster);
			var incidentAngle = p.rotation - rotationToThruster;
			if(this.verbose) console.log(" incident angle " + incidentAngle);
			var angularRatio = Math.sin(incidentAngle);
			if(this.verbose) console.log(" angular ratio " + angularRatio);
			var angularThrust = angularRatio * thrustAmt * angularDamp;
			if(Math.abs(angularThrust) < thrustEpsilon) angularThrust = 0;
			if(this.verbose) console.log(" angular thrust " + angularThrust);
			
			if(angularThrust < 0) minA += angularThrust;
			else maxA += angularThrust;
			
			
			//store cached value
			thruster.cachedAccelModel.maxAngular = angularThrust;
			thruster.cachedAccelModel.maxLinear.setVec(linearThrust);
		}
		this.cachedMinMax = {minA:minA, maxA:maxA, minX:minX, maxX:maxX, minY:minY, maxY:maxY };
	}
	
	//returns { linear:Vec2D, angular:float }
	//NOTE: if this changes, calculateEverything() needs to be updated as well
	calculateAcceleration() {
		let angularDamp = this.angularDampening;
		var linearTot = new Vec2D();
		var angularTot = 0;
		for(let thruster of this.thrusters) {
			if(thruster.control <= 0) continue;
			
			var thrustAmt = thruster.control * thruster.maxThrust;
			
			//get the thruster's ship relative transform
			var p = thruster.rGetShipRelativePosAndRot();
			//make it world relative
			//var worldPos = p.pos.getVecRotation(this.rotation);
			var worldRot = p.rotation + this.rotation;
			
			//get world realtive thrust vector
			var linearThrust = Vec2D.getVecFromRadians(worldRot); //unit
			
			linearThrust.scalarMult(thrustAmt);
			
			//get angular amt
			var rotationToThruster = p.pos.getVecSub( this.CoM.pos ).toRadians();
			var incidentAngle = p.rotation - rotationToThruster;
			var angularRatio = Math.sin(incidentAngle);
			var angularThrust = angularRatio * thrustAmt * angularDamp;
			
			//console.log("thruster at " + p.pos.toString() + " -> " + linearThrust.toString() + " + @" + angularThrust);
			linearTot.addVec(linearThrust);
			angularTot += angularThrust; 
		}
		
		
		return { linear: linearTot, angular: angularTot };
	}
	
	getCoMPosWorld() {
		return this.pos.getVecAdd( this.CoM.pos.getVecRotation(this.rotation) );
	}
	
	calculateCoM() {
		var com = {
			pos: new Vec2D(),
			mass: (this.frame ? this.frame.mass : 0)
			};
			
		if(this.frame) {
			this._rCalculateCoM( com, this.frame);
		}
		
		console.log("com calculated: " + com.mass + "u at " + com.pos.toString())
		this.CoM = com;
	}
	_rCalculateCoM( com, part) {
		for(var i=0; i< part.children.length; i++) {
			var child = part.children[i];
			
			//ratio of added Mass to current CoM
			var massRatio = child.mass / com.mass;
			//add child's mass to total
			com.mass += child.mass;
			
			//update center position
			var vecToChildFromCenter = child.pos.getVecSub(com.pos);
			com.pos.addVec( vecToChildFromCenter.getScalarMult(massRatio) );
		}
		//apply parent's rotation
		if(part.rotation != 0) {
			com.pos.rotate( part.rotation );
		}
		
	}
	
	getAngularAcceleration() {
		return this.angularAccelExt + this.angularAccelThrusters;
	}
	
	getLinearAcceleration() {
		return this.linearAccelExt.getVecAdd(this.linearAccelThrusters);
	}

	Update( dt, ct ) {
		//calculate thruster contribution
		var tTot = this.calculateAcceleration();
		
		if( isNaN(tTot.angular) ) {
			console.error("uhoh, calculated angular acceleration is NaN?");
		}
		
		this.linearAccelThrusters.setVec( tTot.linear );
		this.angularAccelThrusters = tTot.angular;
		
		//apply accelerations
		this.vel.addVec( this.linearAccelExt.getScalarMult(dt) );
		this.vel.addVec( this.linearAccelThrusters.getScalarMult(dt));
		this.angularVel += this.angularAccelExt * dt;
		this.angularVel += this.angularAccelThrusters * dt;
		
//		var velEpsilon = 0.005;
//		if(Math.abs(this.angularVel) < velEpsilon ) this.angularVel = 0;
//		if(Math.abs(this.vel.x) < velEpsilon ) this.vel.x = 0;
//		if(Math.abs(this.vel.y) < velEpsilon ) this.vel.y = 0;
		
		//apply velocities
		this.pos.addVec( this.vel.getScalarMult(dt) );
		
		let rotAmt = this.angularVel * dt;
		if(rotAmt != 0) {
			//rotate position around CoM by angularVel
			let rotOffsetBefore = this.CoM.pos.getVecRotation(this.rotation);
			this.rotation += rotAmt;
			let rotOffsetAfter = this.CoM.pos.getVecRotation(this.rotation);
			this.pos.addVec(rotOffsetBefore).addVec(rotOffsetAfter.scalarMult(-1));
			
			//if rotation grows above Math.PI*2 or below 0, need to wrap it
			if(this.rotation < 0 ) {
				this.rotation += Math.PI*2;
			}else if(this.rotation > Math.PI*2) {
				this.rotation -= Math.PI*2;
			}
		}
		
		if(this.view) {
			//update view
			this.view.rotation = this.rotation;
			this.view.pos.setVec(this.pos);
		}
	}
	
	getPartByUID(uid) {
		return this.frame.getPartByUID(uid);
	}
	
	handleDamageToPart( partUID, damage ) {
		var part = this.getPartByUID( partUID );
		if(!part) return;
		
		part.hp -= damage;
		//TODO: show 'damage' decal?
		
		if(part.hp <= 0) {

			
			//part destroyed
			if(part.children.length>0) {
				//TODO: handle complicated case of floating the children pieces
				console.log("todo: float children");
				for(var cidx = part.children.length-1; cidx >= 0; cidx--) {
					let c = part.children[cidx];
					var posAndRot = c.rGetShipRelativePosAndRot();

					var vel = c.pos.getScalarMult(0.5);
					var angularVel = (vel.x > 0) ? 0.03 : -0.03;

					posAndRot.pos.rotate(this.rotation);
					posAndRot.pos.addVec(this.pos);
					posAndRot.rotation += this.rotation;

					c.rotation = posAndRot.rotation;
					c.pos.setVec( posAndRot.pos );
					c.vel = vel;
					c.angularVel = angularVel;
					c.removeFromParent();
					EventBus.game.dispatch({evtName:"floatPart", part:c});
				}
			}
			
			part.removeFromParent();
			//TODO: add debris
			
			if(part == this.frame) {
				//whole ship destroyed
				EventBus.game.dispatch({evtName:"shipDestroyed", ship:this});
			}else {
				this.calculateEverything();
				this.view = ShipView.CreateShipView(this);	
			}
		}	
	}
	
	//TODO: get rid of this
	dbgLoseEngine() {
		var thruster = this.thrusters[0];
		this.frame.removePartByUID(thruster.uid);
		
		//rebuild com/accel graph
		this.calculateEverything();
		this.view = ShipView.CreateShipView(this);
		//this.dbgBuildView(); //rebuild view, including new CoM offset
	}
	
}