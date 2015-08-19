"use strict"; //ES6

class HangarEditorModel {
	constructor() {
		
		var app = Service.get("app");
		this.userInventory = app.state.userInventory;
		
		//used by View to hold part being dragged around
		this.dragPart = null;
		
		this.ship = null;
		this.createUserShip();
		//TODO: list of available parts
	}
	
	Destroy() {
		var app = Service.get("app");
		
		console.log("before save: " + app.state.userInventory);
		
		//reapply ship model to userinventory
		var shipJson = this.ship.toJson();
		this.userInventory.activeShip = shipJson;

		app.state.userInventory = this.userInventory;
		
		console.log("after save: " + app.state.userInventory);
	}
	
	saveBlueprintData( blueprintName ) {
		var shipJson = this.ship.toJson();
		var SaveData = Service.get("sd");
		var blueprints = SaveData.load("blueprints");
		blueprints[blueprintName] = { "parts":shipJson };
		SaveData.save("blueprints", blueprints);
		console.log("saved blueprint " + blueprintName);
	}
	
	Update(dt,ct) {}
	
	canLaunch() {
		return this.getReqStatus_Frame() && this.getReqStatus_Reactor() && this.getReqStatus_Cockpit();
	}
	
	getReqStatus_Frame() {
		return this.ship.frame && (this.ship.frame.category == "frame")
	}
	getReqStatus_Reactor() {
		return this.ship.frame && (this.ship.frame.getReactors().length > 0)
	}
	getReqStatus_Cockpit() {
		return this.ship.frame && (this.ship.frame.getCockpits().length == 1)
	}
	
	isDragPartOfCategory( category ) {
		if(!this.dragPart) return false;
		return this.dragPart.category == category;
	}
	
	createDragPartFromSpare( partTypeID ) {
		if(this.dragPart != null) {
			console.error("trying to create drag part, but we already have one");
			return false;
		}
		if(this.userInventory.spareParts[partTypeID] < 1 ) {
			return false;
		}
		
		//dont actually subtract it yet; if we crashed, the part would be lost in space!
		//this.model.userInventory.spareParts[sparePartTypeID] --;
		
		var part = ShipPartFactory.getPartFromType(partTypeID);
		this.dragPart = part;
		
		return true;
	}
	
	clearDragPart() {
		if(this.dragPart == null) {
			console.error("trying to clear drag part, but we dont have one");
			return false;
		}
		
		this.dragPart = null;
	}
	
	createUserShip() {

		var ship = new ShipModel();
		ship.fromJson(this.userInventory.activeShip);
		this.ship = ship;

		//build the view component
		ship.view = ShipView.CreateShipView(ship);
	}
	
	removeAllPartsFromShip() {
		if(this.ship.frame == null) {
			return; //already empty
		}
		
		this.rRemoveAllChildParts(this.ship.frame);
		//this.removePartFromShipByUID( this.ship.frame.uid );
	}
	rRemoveAllChildParts( parent ) {
		if(parent.children.length > 0) {
			for(var i = parent.children.length - 1; i>=0; i--) {
				var c = parent.children[i];
				this.rRemoveAllChildParts(c);
				this.removePartFromShipByUID( c.uid );
			}
		}
	}
	
	removePartFromShipByUID( uid ) {
		//1) find part
		var partModel = this.ship.getPartByUID( uid );
		//2) remove from ship
		if(partModel == this.ship.frame) {
			this.ship.frame = null;
		}else {
			partModel.removeFromParent();
		}
		
		//3) add to spareParts inv
		var partTypeID = partModel.type;
		if(!this.userInventory.spareParts[partTypeID] ) {
			this.userInventory.spareParts[partTypeID] = 0; //ensure entry
		}
		this.userInventory.spareParts[partTypeID]++; //increment qty
		EventBus.ui.dispatch({evtName:"hangarSparePartsUpdated"});
		
		//x) update CoM
		this.ship.calculateEverything();
		EventBus.ui.dispatch({evtName:"shipUpdated"});
	}
	
	//called when adding a new ship part from inventory to the ship
	attachPartToShipPartByUID( parentUID, pos, rotation ) {
		//0) ensure part qty
		var partTypeID = this.dragPart.type;
		if(this.userInventory.spareParts[partTypeID] < 1 ) {
			console.error("tried to add part of which we have no qty");
			return;
		}
		
		if(!this.ship.frame) {
			//special case, first part
			if(this.dragPart.category != 'frame') return false; //enforce first part is 'frame' type
			
			this.ship.frame = this.dragPart;
			//pos of first frame is always <0,0>
			this.ship.frame.rotation = rotation;
			
		}else {
			//1) find parent part
			var parentPartModel = this.ship.getPartByUID( parentUID );
			
			//2) attach child part
			var childPart = this.dragPart;
			childPart.pos = pos;
			childPart.rotation = rotation;
			parentPartModel.addChild(childPart);
		}

		//3) subtract part qty
		this.userInventory.spareParts[partTypeID]--; //decrement qty
		EventBus.ui.dispatch({evtName:"hangarSparePartsUpdated"});
		
		this.dragPart = null;
		
		//x) update CoM
		this.ship.calculateEverything();
		EventBus.ui.dispatch({evtName:"shipUpdated"});
		
		return true;
	}
	
	//called when moving a pre-existing ship part to a different part of the ship
	reattachPartToShipByUID( parentUID, pos, rotation, childUID ) {
		
		if(this.ship.frame.uid == childUID) {
			//root frame part is being dropped back in place

			//pos of first frame is always <0,0>
			this.ship.frame.rotation = rotation;
		}else {
			//1) find parts
			var childPart = this.ship.getPartByUID( childUID );
			var parentPartModel = this.ship.getPartByUID( parentUID );
			
			//2) remove part from old parent, add to new
			childPart.removeFromParent();
			childPart.pos = pos;
			childPart.rotation = rotation;
			parentPartModel.addChild(childPart);
		}
		
		//x) update CoM
		this.ship.calculateEverything();
		EventBus.ui.dispatch({evtName:"shipUpdated"});
	}
 }