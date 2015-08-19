"use strict"; //ES6
/*
class ThrusterPID {
	constructor( thruster ) {
		this.pThruster = thruster;
		var tPerf = this.pThruster.cachedAccelModel;
		
		var timeStep = 1/30;
		var weightEpsilon = 0.00001;
		
		//TODO: configure constants based on thruster
		var p = 1; //3;
		var i = 1; //1;
		var d = 0.005;
		this.aPID = new PIDController(p,i,d, timeStep, tPerf.maxAngular < 0);
		this.aPID.setOutputRange(0, 1);
		this.xPID = new PIDController(p,i,d, timeStep, tPerf.maxLinear.x < 0);
		this.xPID.setOutputRange(0, 1);
		this.yPID = new PIDController(p,i,d, timeStep, tPerf.maxLinear.y < 0);
		this.yPID.setOutputRange(0, 1);
		
		var aWeight = (tPerf.maxAngluar == 0) ? 0 : 1;
		var maxX = Math.abs(tPerf.maxLinear.x);
		var maxY = Math.abs(tPerf.maxLinear.y);
		
		var xWeight = 0; var yWeight = 0;
		if( maxX != 0 || maxY != 0 ) {  //avoid possible divide by zero
			xWeight = maxX / (maxX + maxY);
			if( Math.abs(xWeight) < weightEpsilon ) xWeight = 0; //epsilon check
			yWeight = 1 - xWeight;
			if( Math.abs(yWeight) < weightEpsilon ) yWeight = 0; //epsilon check
		}
		this.setControlWeights( aWeight, xWeight, yWeight);
	}
	
	setControlWeights( A, X, Y ) {
		this.weightA = A;
		this.weightX = X;
		this.weightY = Y;
		this.weightTot = this.weightA + this.weightX + this.weightY;
	}
	
	_appliesThrust(axis, desired, weight) {
		if( weight == 0 ) return false;
		if( axis < 0 && desired < 0 ) return true;
		if( axis > 0 && desired > 0 ) return true;
		return false;
	}
	
	step( measuredAccelA, measuredAccelX, measuredAccelY, targetAccelA, targetAccelX, targetAccelY, dt ) {
		var tPerf = this.pThruster.cachedAccelModel;
		
		var ctrlA = 0;
		var ctrlX = 0;
		var ctrlY = 0;
		var weightTot = 0;
		if(this._appliesThrust(tPerf.maxAngular, targetAccelA, this.weightA)) {
			ctrlA = this.aPID.step(measuredAccelA, targetAccelA, dt);
			weightTot += this.weightA;
		}
		if(this._appliesThrust(tPerf.maxLinear.x, targetAccelX, this.weightX)) {
			ctrlX = this.xPID.step(measuredAccelX, targetAccelX, dt);
			weightTot += this.weightX;
		}
		if(this._appliesThrust(tPerf.maxLinear.y, targetAccelY, this.weightY)) {
			ctrlY = this.yPID.step(measuredAccelY, targetAccelY, dt);
			weightTot += this.weightY;
		}
		var ctrlTot = 0;
		if( weightTot > 0) ctrlTot = (ctrlA*this.weightA + ctrlX*this.weightX + ctrlY*this.weightY) / weightTot;
		return Math.max(0.0, Math.min(ctrlTot, 1.0)); //clamp between 0.0-1.0
	}
}
//*/

class LinearThrusterSolver {
	constructor(thrusters) {
		this.A = this.CreateMatrixA( thrusters );
		this.b = this.CreateColumnB(0,0,0, thrusters.length);
		this.c = this.CreateColumnC(thrusters.length);
	}
	
	/// input: a, x, y, are target Angular, X/Y accelerations to achieve given thruster control output
	/// output: [t1,t2,t3,...tn, errorVal]  where error value can be ignored
	Solve( a, x, y ) {
		
		//update column b
		this.b[0] = a;
		this.b[1] = x;
		this.b[2] = y;
		this.b[3] = -a;
		this.b[4] = -x;
		this.b[5] = -y;
		
		//run solver
		var r = numeric.solveLP(this.c, this.A, this.b);
		numeric.trunc(r.solution,1e-6);
		
		if(r.message) {
			console.error(r);
		}
		return r.solution;
	}
	
	CreateColumnC( numThrusters ) {
		var c = [];
		for(let i=0; i< numThrusters; i++) c.push(1);
		c.push(100);
		return c;
	}
	
	CreateColumnB( targetA, targetX, targetY, numThrusters ) {
		var b = [targetA, targetX, targetY, -1*targetA, -1*targetX, -1*targetY, 0]; //0,0,0, 1,1,1];
		for(let i=0; i< numThrusters; i++) b.push(0);
		for(let i=0; i< numThrusters; i++) b.push(1);
		return b;
	}

	
	//should be cached, only update when thrusters/CoM changes
	CreateMatrixA( thrusters ) {
		var rowA = [];
		var rowX = [];
		var rowY = [];
		var rowA_ = [];
		var rowX_ = [];
		var rowY_ = [];
		var row0 = [];
		for(let t of thrusters ) {
			var accel = t.cachedAccelModel;
			rowA.push( accel.maxAngular );
			rowX.push( accel.maxLinear.x );
			rowY.push( accel.maxLinear.y );
			rowA_.push( accel.maxAngular * -1 );
			rowX_.push( accel.maxLinear.x * -1 );
			rowY_.push( accel.maxLinear.y * -1 );
			row0.push( 0 );
		}
		rowA.push(-1);
		rowX.push(-1);
		rowY.push(-1);
		rowA_.push(-1);
		rowX_.push(-1);
		rowY_.push(-1);
		row0.push(-1);
		
		var matrixA = [ rowA, rowX, rowY, rowA_, rowX_, rowY_, row0 ];
		
		var diag = thrusters.length;
		
		//add negative identity matrix
		for(var y=0; y<diag; y++) {
			let row = [];
			for(var x=0; x<diag; x++) {
				row.push( (x==y)? -1 : 0 );
			}
			row.push(0);
			matrixA.push( row );
		}

		//add posative identity matrix
		for(var y=0; y<diag; y++) {
			let row = [];
			for(var x=0; x<diag; x++) {
				row.push( (x==y)? 1 : 0 );
			}
			row.push(0);
			matrixA.push( row );
		}

		return matrixA;
	}
	
	static UnitTest() {
		var testThrusters = [
			{ cachedAccelModel:{ maxAngular:  0, maxLinear:{x:0, y:-100} } },
			{ cachedAccelModel:{ maxAngular:-15, maxLinear:{x:0, y: 100} } },
			{ cachedAccelModel:{ maxAngular: 15, maxLinear:{x:0, y: 100} } },
			{ cachedAccelModel:{ maxAngular: 0, maxLinear:{x:100, y: 0} } },
			{ cachedAccelModel:{ maxAngular: 0, maxLinear:{x:-100, y: 0} } }
			];
			
		var linearSolver = new LinearThrusterSolver(testThrusters);
		console.log(linearSolver.solution);
	}
}

class ShipController {
	constructor( ship ) {
		this.ship = ship;
		this.rotationTarget = new Vec2D();
		this.joystick = { r:false, u:false, d:false, l:false,
				a1:false, a2:false, a3:false, a4:false,
				a1d:false,
				getX:function() {
					var v = 0;
					if(this.r) v += 1;
					if(this.l) v -= 1;
					return v;
				},
				getY:function() { 
					var v = 0;
					if(this.d) v += 1;
					if(this.u) v -= 1;
					return v;
				},
				draw: function(g, x,y) {
					if(this.u) g.drawRect(x + 10, y + 10,10,10);
					if(this.d) g.drawRect(x + 10, y + 30,10,10);
					if(this.l) g.drawRect(x +  0, y + 20,10,10);
					if(this.r) g.drawRect(x + 20, y + 20,10,10);
				}
		};
		
		var timeStep = 1/30;
		this.rotPID = new PIDController(3,1,0.005, timeStep);
		var p = 3;
		var i = 2;
		var d = 0.005;
		this.avPID = new PIDController(p,i,d, timeStep);
		

		this.thrusterPIDs = [];
		
		this.linearSolver = null;
	}
	
	//rebuild all thruster PIDs based on current thrusters + CoM
	// call this any time the CoM changes (lost a thruster or cargo, etc)
	updateThrustControllers() {
		this.linearSolver = new LinearThrusterSolver(this.ship.thrusters);
	}
	
	Update(dt, ct) {
		let ship = this.ship;
		let joystick = this.joystick;
		
		// ** weapon systems **
		if(joystick.a1) {
			if(!joystick.a1d) {
				var weapons = this.ship.getWeapons();
				for( let weap of weapons ) {
					EventBus.game.dispatch({evtName:"fireWeapon", fromShip:this.ship, weapon:weap });
				}
			}

			joystick.a1d = true;
		}else {
			joystick.a1d = false;
		}
		
		// ** navigation **

		/* Control Scheme Alpha - direct acceleration
		let rotationAmt = joystick.getX() * (Math.PI / 2);
		//todo: apply 'foward' acceleration 
		var linearAmt = joystick.getY() * 5 * 1000;
		ship.angularAccel = rotationAmt;
		 
		//calculate linear acceleration (in a straight 'forward' line)
		var accelVec = Vec2D.getVecFromRadians(ship.rotation);
		ship.linearAccel = accelVec.getScalarMult(linearAmt * dt);
		//*/
		
		/* Control scheme beta - direct thruster control
		if(ship.thrusters[0]) ship.thrusters[0].control = Math.max(0, joystick.a1);
		if(ship.thrusters[1]) ship.thrusters[1].control = Math.max(0, joystick.a2);
		if(ship.thrusters[2]) ship.thrusters[2].control = Math.max(0, joystick.a3);
		if(ship.thrusters[3]) ship.thrusters[3].control = Math.max(0, joystick.a4);
		//*/
		
		//* Control scheme gamma - Thruster Control System
		var ctrlRotAccel = 0;
		var ctrlXAccel = 0;
		var ctrlYAccel = 0;
		
		{
			//handle 0<->PI*2 boundary
			var desiredRotation = this.rotationTarget.toRadians();
	
			let rotDelta = desiredRotation - ship.rotation;
			if( Math.abs(rotDelta) > Math.PI ) {	
				//phase shift required
				var full = Math.PI*2;
				var delta2 = (rotDelta < 0) ? rotDelta + full : rotDelta - full;
				desiredRotation = ship.rotation + delta2;
			}
			this.dbgDesiredRotation = desiredRotation;
			
			// PID Phase 1 -- direct rotation vel, zero x/y vel
			var rotSample = ship.rotation;
			this.rotPID.setOutputRange( ship.cachedMinMax.minA, ship.cachedMinMax.maxA );
			var ctrlRotVel = this.rotPID.step(rotSample, desiredRotation, dt);
	
			//WIP - cachedMinMax is in accel; cap target vel by accel * some constant
			// PID Phase 2 -- rotationPID1 -> accelleration PID2'; control by perfect acceleration thrust
			if(ctrlRotVel < ship.cachedMinMax.minA) ctrlRotVel = ship.cachedMinMax.minA;
			else if(ctrlRotVel > ship.cachedMinMax.maxA) ctrlRotVel = ship.cachedMinMax.maxA;
			
			//var angularVelSample = ship.rotation; //direct from position/not velocity
			//var angularVelTarget = desiredRotation;
			var angularVelSample = ship.angularVel; //cascade from PID1
			var angularVelTarget = ctrlRotVel;
			
			ctrlRotAccel = this.avPID.step(angularVelSample, angularVelTarget, dt);
	
			// xy is ship-relative	
			ctrlXAccel = joystick.getX();
			ctrlYAccel = joystick.getY();
			
			// clamp target acceleration values to min/max output capacity of ship
			if(ctrlRotAccel < ship.cachedMinMax.minA) ctrlRotAccel = ship.cachedMinMax.minA;
			else if(ctrlRotAccel > ship.cachedMinMax.maxA) ctrlRotAccel = ship.cachedMinMax.maxA;	
			if(ctrlXAccel < 0) ctrlXAccel *= Math.abs(ship.cachedMinMax.minX);
			else ctrlXAccel *= ship.cachedMinMax.maxX;
			if(ctrlYAccel < 0) ctrlYAccel *= Math.abs(ship.cachedMinMax.minY);
			else ctrlYAccel *= ship.cachedMinMax.maxY;
		}
		
		if(joystick.applyBreaks) {
			//ship-relative velocity
			var shipRel = ship.vel.getVecRotation(-ship.rotation);
			ctrlXAccel = shipRel.x * -1;
			ctrlYAccel = shipRel.y * -1;

			if(ctrlXAccel < ship.cachedMinMax.minX) ctrlXAccel = ship.cachedMinMax.minX;
			else if(ctrlXAccel > ship.cachedMinMax.maxX) ctrlXAccel = ship.cachedMinMax.maxX;
			if(ctrlYAccel < ship.cachedMinMax.minY) ctrlYAccel = ship.cachedMinMax.minY;
			else if(ctrlYAccel > ship.cachedMinMax.maxY) ctrlYAccel = ship.cachedMinMax.maxY;	
		}
		
		// xy is ship-relative
		var relativeVel = ship.vel.getVecRotation(-ship.rotation);
		this.dbgRelativeVel = relativeVel.clone();

		this.controlThrust(ctrlRotAccel, ctrlXAccel, ctrlYAccel, dt);
		
	}
	
	controlThrust( targetAccelA, targetAccelX, targetAccelY, dt ) {
		let ship = this.ship;


		//linear solver
		var r = this.linearSolver.Solve(targetAccelA, targetAccelX, targetAccelY);
		for(var i=0; i< ship.thrusters.length; i++) {
			var thruster = ship.thrusters[i];
			thruster.control = r[i];
		}
	}

}