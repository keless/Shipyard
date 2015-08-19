"use strict"; //ES6


/**
 * View selecting blueprints
 */
 
class BlueprintSelectorView  extends BaseStateView {
	constructor( model ) {
		super();
		this.model = model;
		
		this.modalAlert = null;

		this.root = new NodeView();
		this.createShipPanel();
		this.createNavButton();
		this.createBPListPanel();
		
		this.SetListener(EventBus.ui, "bpBtnClicked", this.onBlueprintBtnClicked);
		this.SetListener(EventBus.ui, "shipUpdated", this.onShipUpdated);
	}
	
	onBlueprintBtnClicked(e) {
		var blueprintName = e.bpName;
		this.model.switchToBlueprintWithName(blueprintName);
	}
	
	onShipUpdated(e) {
		this.lblCurrentBP.updateLabel("["+this.model.blueprintName+"]");
	}
	
	gotoHangar(e) {
		EventBus.game.dispatch({evtName:"gotoState", state:GameStateController.STATE_HANGAR});
	}
	
	doLoadBP(e) {
		//try to make the blueprint into the current active ship in hangar
		if(!this.model.makeBlueprintIntoActiveShip()) {
			this.createModalAlert("ALERT", "Inventory does not contain neccesary parts to build this blueprint.");
			return;
		}
		
		//go to hangar
		EventBus.game.dispatch({evtName:"gotoState", state:GameStateController.STATE_HANGAR});
	}
	
	doDeleteBP(e) {
		var blueprintName = this.model.blueprintName;
		
		var result = confirm("Delete blueprint " + blueprintName + "?");
		if(!result) return; //user cancelled
		
		//dont delete if its the ONLY blueprint left
		if(!this.model.deleteBlueprint( blueprintName )) {
			this.createModalAlert("ALERT", "Cannot delete; only blueprint left.");
			return;
		}

		//update list
		this.fillBPListPanel();
	}
	
	createModalAlert( title, message ) {
		var modal = new NodeView();
		var w = 400;
		var h = 300;
		modal.setRect(w, h, "#FFFFFF");
		
		var gfx = Service.get("gfx");
		modal.pos.setVal(gfx.getWidth()/2, gfx.getHeight()/2);
		
		var lblTitle = new NodeView();
		lblTitle.setLabel(title, "15px Arial", "#FF0000");
		lblTitle.pos.setVal(0, (-h/2)+25 );
		modal.addChild(lblTitle);
		
		var lblMessage = new NodeView();
		lblMessage.setLabel(message, "12px Arial", "#000000");
		lblMessage.pos.setVal(0, 0);
		modal.addChild(lblMessage);
		
		this.modalAlert = modal;
		this.root.addChild(this.modalAlert);
	}
	dismissModal() {
		this.modalAlert.removeFromParent();
		this.modalAlert = null;
	}
	
	createShipPanel() {
		var RP = Service.get("rp");
		this.bg = RP.getImage("gfx/aelius_floor.jpg");
		
		var gfx = Service.get("gfx");
		var w = (gfx.getWidth()-300);
		var h = gfx.getHeight();
			
		this.shipPanel = new NodeView();
		this.shipPanel.pos.setVal(w/2, h/2);
		this.shipPanel.size = new Vec2D(w,h);
		
		var self = this;
		this.shipPanel.addCustomDraw(function(g, x,y, ct){
			g.drawImageTiled(self.bg, x, y, w, h, 0.25);
			self.model.ship.view.draw(g, x,y, ct);
		});
		
		//this.shipPanel.addChild(this.model.ship.view);
		//this.model.ship.view.pos.setVal(0,0);
		
		this.root.addChild(this.shipPanel);
	}
	
	createNavButton() {
	 	//add button to switch to hangar state
		var RP = Service.get("rp");
		var sprBtnBlue = RP.getSprite("gfx/btn_blue.sprite");
		this.btnLaunch = new ButtonView("navHangar", sprBtnBlue, "BACK", "14px Arial", "#FFFF00");
		this.btnLaunch.pos.setVal(500, 50);
		//this.btnLaunch.rotation = Math.PI/3;
		
		this.SetListener(EventBus.ui,"navHangar", this.gotoHangar);
		this.root.addChild(this.btnLaunch);
		
		var sprBtnDark = RP.getSprite("gfx/btn_dark.sprite");
		this.btnLoadBP = new ButtonView("navLoad", sprBtnDark, "Load", "14px Arial", "#FFFF00");
		this.btnLoadBP.pos.setVal(650, 50);
		
		this.SetListener(EventBus.ui,"navLoad", this.doLoadBP);
		this.root.addChild(this.btnLoadBP);
		
		
		this.btnDeleteBP = new ButtonView("navDelete", sprBtnDark, "Delete", "14px Arial", "#FFFF00");
		this.btnDeleteBP.pos.setVal(650, 95);
		
		this.SetListener(EventBus.ui,"navDelete", this.doDeleteBP);
		this.root.addChild(this.btnDeleteBP);		
		
	}
	
	createBPListPanel() {
		var gfx = Service.get("gfx");
		this.invPanel = new NodeView();
		var w = 300;
		var h = gfx.getHeight();
		this.invPanel.setRect(w,h, "#222222");
		this.invPanel.pos.setVal(gfx.getWidth() - w/2,  h/2 );
		this.root.addChild(this.invPanel);
		
		this.lblCurrentBP = new NodeView();
		this.lblCurrentBP.setLabel("["+this.model.blueprintName+"]", "15px Arial", "#FFFFFF");
		this.lblCurrentBP.pos.setVal(0, -(h/2 - 50));
		this.invPanel.addChild(this.lblCurrentBP);
		
		
		var originalMouseDown = (this.invPanel.OnMouseDown).bind(this.invPanel);
		this.invPanel.OnMouseDown = function(e, x,y) {
			var originX = this.pos.x;
			var originY = this.pos.y;
			if( Config.areSpritesCentered ) {
				originX -= this.size.x/2;
				originY -= this.size.y/2;
			}
			if( Rect2D.isPointInArea(x,y, originX, originY, this.size.x, this.size.y) ) {
				EventBus.ui.dispatch({evtName:"invPanelClicked"});
			}
			originalMouseDown(e, x,y);
		}
		
		
		this.fillBPListPanel();
	}
	
	fillBPListPanel() {
		//make sure to clear previous list before rebuilding
		this.invPanel.removeAllChildren();
		
		//rebuild list
		var i = 0;
		var padding = 5;
		for(let blueprintName in this.model.blueprints) {
			
			var bpListView = new BlueprintListView(blueprintName, this.model.blueprints[blueprintName]);
			bpListView.pos.y = i * (bpListView.size.y + padding);
			
			this.invPanel.addChild(bpListView);
			i++;
		}
	}
	
	OnMouseDown(e, x,y) {
		if(this.modalAlert) {
			this.dismissModal();
			return;
		}
		
		this.root.OnMouseDown(e,x,y);
	}
	
	Draw( g, x,y, ct) {
		//g.drawRectEx(g.getWidth()/2, g.getHeight()/2, g.getWidth(), g.getHeight(), "#000000");

		if(this.dragView) {
			var app = Service.get("app");
			this.dragView.pos.setVec( app.lastMousePos );
		}
		
		this.root.draw(g, x,y)
	}
}

class BlueprintListView extends NodeView {
	constructor( bpName, bpJson ) {
		super();
		this.bpName = bpName;
		this.bpJson = bpJson;
		
		this.setRect(250, 50, "#FFFFFF");
		
		var labelText = this.bpName;
		this.setLabel(labelText, "12px Arial", "#000000");
	}
	
	OnMouseDown(e, x,y) {
		var originX = this.pos.x;
		var originY = this.pos.y;
		if( Config.areSpritesCentered ) {
			originX -= this.size.x/2;
			originY -= this.size.y/2;
		}
		if( Rect2D.isPointInArea(x,y, originX, originY, this.size.x, this.size.y) ) {
			//clicked
			EventBus.ui.dispatch({evtName:"bpBtnClicked", bpName:this.bpName});
		}
	}
}