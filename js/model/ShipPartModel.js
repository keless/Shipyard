"use strict"; //ES6
//#include js/framework/Vec2D.js

class ShipPartModel {
	constructor( uid ) {
		this.uid = uid || uuid.v4(); //generate a new UUID if not given
		//NOTE: pos and rotation are relative to parent
		this.pos = new Vec2D(); 
		this.rotation = 0; //in radians, clockwise, zero is up
		
		this.hp = 0;
		
		this.type = "";
		this.partJson = null;
		
		this.children = [];
		this.parent = null;
	}
	
	get mass() {
		return this.partJson.mass;
	}
	get imageName() {
		return this.partJson.imageName;
	}
	get maxThrust() {
		if(this.partJson.maxThrust) return this.partJson.maxThrust;
		throw "Not a thruster";
	}
	get isMountable() {
		if(this.partJson.mountable) return this.partJson.mountable;
		return false;
	}
	get category() {
		return this.partJson.category;
	}
	
	toJson() {
		var json = {};
		
		//pull non-instance data from catalog based on 'type' id
		json.type = this.type;
		
		json.pos = { x: this.pos.x, y: this.pos.y };
		json.rotation = this.rotation;
		json.hp = this.hp;

		if(this.children.length > 0) json.children = [];
		for(let c of this.children) {
			var cJson = c.toJson();
			json.children.push(cJson);
		}
		return json;
	}
	fromJson( json ) {
		this.type = json.type;
		this.partJson = ShipPartCatalog.getPartJson(this.type);
		this.hp = this.partJson.mass;
		
		if(this.partJson.category == "thruster") {
			this.setThrusterProperties(json.maxThrust);
		}
		
		if(json.pos) { 
			this.pos.setVal(json.pos.x, json.pos.y);
		}
		if(json.rotation) {
			this.rotation = json.rotation;
		}
		if(json.hp) {
			this.hp = json.hp;
		}

		if(json.children) {
			for(let cJson of json.children) {
				var cPart = new ShipPartModel();
				cPart.fromJson(cJson);
				this.addChild(cPart);
			}
		}
	}
	
	getThrusters() {
		return this.rGetPartsOfCategory("thruster");
	}
	getReactors() {
		return this.rGetPartsOfCategory("reactor");
	}
	getCockpits() {
		return this.rGetPartsOfCategory("cockpit");
	}
	getWeapons() {
		return this.rGetPartsOfCategory("weapon");
	}
	
	//returns an array of object references to all objects of given category
	rGetPartsOfCategory( category ) {
		var partsList = [];
		
		if(this.partJson.category == category) {
			partsList.push(this);
		}
		for(let c of this.children) {
			var cParts = c.rGetPartsOfCategory(category);
			if(cParts.length > 0 ) {
				partsList = partsList.concat(cParts);
			}
		}
		return partsList;
	}
	
	//returns a dictionary keyed by all part types, with value == qty of each type
	//note: recursive
	getPartQtys() {
		var partQtysDict = {};
		this.rGetPartQtys( partQtysDict );
		return partQtysDict;
	}
	
	rGetPartQtys( partQtysDict ) {
		if(!partQtysDict.hasOwnProperty(this.type)) {
			partQtysDict[this.type] = 1;
		}else {
			partQtysDict[this.type]++;
		}
		
		for(let c of this.children) {
			c.rGetPartQtys( partQtysDict );
		}
	}
	
	setThrusterProperties( maxThrust ) {

		//value between 0.0-1.0
		this.control = 0;

		// ShipModel should pre-calculate the maximum accel model of the thruster 
		//   and cache it here after the ship's CoM has been calculated
		this.cachedAccelModel = { maxAngular:0, unitAngular:0, maxLinear:new Vec2D(), unitLinearX:0, unitLinearY:0 }; 
	}
	
	//node heirarchy functions
	addChild( child ) {
		child.removeFromParent();
		
		this.children.push(child);
		child.parent = this;
	}
	removeFromParent() {
		if(!this.parent) return;
		this.parent.removeChild(this);
		this.parent = null;
	}
	
	removeChild(child) {
		var childIdx = this.children.indexOf(child);
		this.removeChildByIdx(childIdx);
	}
	removeChildByIdx( childIdx ) {
		if(childIdx < 0) return;
		var child = this.children.splice(childIdx, 1);
		if(child.parent === this) child.parent = null;
	}
	
	//note: recursive
	getPartByUID( uid ) {
		if(this.uid == uid) return this;
		for(let c of this.children) {
			var part = c.getPartByUID(uid);
			if(part) return part;
		}
		return null;
	}
	
	// if the part removed is a 'thruster' the shipModel should make sure to re-cache the thrusters list
	//note: recursive
	removePartByUID( uid ) {
		if(this.uid == uid) {
			this.removeFromParent();
		} else {
			for(let c of this.children) {
				c.removePartByUID(uid);
			}
		}
	}
	
	//note: recursive
	rGetShipRelativePosAndRot() {
		if(this.cacheShipRelPosAndRot) return this.cacheShipRelPosAndRot;
		if(this.parent) {
			var p = this.parent.rGetShipRelativePosAndRot();
			
			var pos = p.pos.getVecAdd(this.pos.getVecRotation(p.rotation));
			var rot = p.rotation + this.rotation;
			
			this.cacheShipRelPosAndRot = { pos:pos, rotation:rot };
			return this.cacheShipRelPosAndRot;
		}else {
			this.cacheShipRelPosAndRot = { pos:this.pos.clone(), rotation: this.rotation };
			return this.cacheShipRelPosAndRot;
		}
	}
	
	// returns group of two Rect2D
	//   has 'rotation' and 'children' properties (where children are )
	//   origin is still top left (but rotation is around center of rect)
	rGetBoundingBox() {
		var bb = new Rect2D();
		if(this.partJson.imageName) {
			var RP = Service.get("rp");
			var img = RP.getImage(this.partJson.imageName);
			bb.setSize( img.width, img.height );
			bb.addVecOffset( this.pos );
			bb.addVecOffset( bb.getSizeVec().getScalarMult(-1 * 0.5) );
		}
		if(this.children.length > 0) {
			bb.children = [];
			var total = bb.clone();
			for( let c of this.children ) {
				var cbbObj = c.rGetBoundingBox();
				bb.children.push(cbbObj);
				var childAABB = Rect2D.getInscribedRotatedRect(cbbObj.self, c.rotation);
				//expand current bounding box by child size
				total.setRect( Rect2D.getUnion( total, childAABB ) );
			}
			return { self:bb, total:total, part:this };
		}
		return { self:bb, total:bb, part:this };
	}
	
}