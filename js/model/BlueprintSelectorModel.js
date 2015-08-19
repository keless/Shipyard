"use strict"; //ES6


/**
 * View for selecting blueprints or saving one
 */
 
class BlueprintSelectorModel {
	constructor( blueprintToLoad ) {
		//var app = Service.get("app");
		
		this.blueprints = Service.get("sd").load("blueprints");
		
		if(!blueprintToLoad) {
			blueprintToLoad = Object.keys(this.blueprints)[0];
		}
		
		
		
		this.ship = null;
		this.blueprintName = "";
		
		var app = Service.get("app");
		this.userInventory = app.state.userInventory;
		
		this.switchToBlueprintWithName(blueprintToLoad);
	}
	
	Destroy() {
		//save blueprints to user data as it may have changed
		Service.get("sd").save("blueprints", this.blueprints);
	}
	
	switchToBlueprintWithName( blueprintName ) {
		if(blueprintName == this.blueprintName) {
			return; //already selected
		}
		
		this.blueprintName = blueprintName;
		this.createShipFromBlueprint( this.blueprints[this.blueprintName].parts );
		
		EventBus.ui.dispatch({evtName:"shipUpdated"});
	}
	
	createShipFromBlueprint( json ) {

		var ship = new ShipModel();
		ship.fromJson( json );
		this.ship = ship;
		
		//build the view component
		ship.view = ShipView.CreateShipView(ship);
	}
	
	deleteBlueprint(blueprintName) {
		if(Object.keys(this.blueprints).length <= 1) {
			return false;
		}
		
		//remove the blueprint
		delete this.blueprints[blueprintName];
		
		
		//switch to a valid blueprint
		var nextBlueprint = Object.keys(this.blueprints)[0];
		this.switchToBlueprintWithName(nextBlueprint);
		
		return true;
	}
	
	//returns false if not enough parts to make the blueprint into an active ship
	makeBlueprintIntoActiveShip() {
		//TODO: turn this off when we have support for multiple ships
		var destroyActiveOnBuild = true;

		//get part list from blueprint
		var partsList = this.ship.getPartsList();
		
		//get parts list from user's current active ship
		var activeShipParts = null;
		if(destroyActiveOnBuild) {
			var activeShipModel = new ShipModel();
			activeShipModel.fromJson(this.userInventory.activeShip);
			activeShipParts = activeShipModel.getPartsList();
		}
		
		var availableParts = this._mergePartsLists(this.userInventory.spareParts, activeShipParts);
		
		if(!this.arePartsAvailableForCurrentBlueprint(partsList, availableParts)) {
			return false;
		}
		
		//destroy current active ship for parts
		if(destroyActiveOnBuild) {
			//add parts to inventory
			this.userInventory.spareParts = availableParts;
		}
		
		//subtract parts from inventory
		this._subtractPartsList(partsList, this.userInventory.spareParts);
		
		//make blueprint into active ship
		var blueprintJson = this.ship.toJson();
		this.userInventory.activeShip = blueprintJson;
		
		return true;
	}
	
	//modifies 'fromThis' by subtracting 'sub' qtys from it
	_subtractPartsList( sub, pFromThis ) {
		for(var partType in sub) {
			pFromThis[partType] -= sub[partType];
		}
	}
	
	//returns a new parts list make out of adding the two input parts lists
	//note: does not modify pl1 or pl2
	_mergePartsLists( pl1, pl2 ) {
		if(!pl2) return pl1;
		var newList = {};
		for(var partType in pl1 ) {
			if(!newList.hasOwnProperty(partType)) {
				newList[partType] = 0;
			}
			newList[partType] += pl1[partType];
		}
		for(var partType in pl2 ) {
			if(!newList.hasOwnProperty(partType)) {
				newList[partType] = 0;
			}
			newList[partType] += pl2[partType];
		}
		return newList;
	}
	
	//returns true if user inventory spareParts has enough parts to build current ship model
	arePartsAvailableForCurrentBlueprint( requiredParts, availableParts ) {
		for(let partType in requiredParts) {
			var qtyNeeded = requiredParts[partType];
			var qtyAvailable = availableParts[partType];
			
			if( qtyNeeded > qtyAvailable ) {
				return false;
			}
		}
		return true;
	}
	
	Update(dt,ct) {}
}