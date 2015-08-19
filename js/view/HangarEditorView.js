"use strict"; //ES6

/**
 * View for hangar (editing ship)
 */
 
class HangarEditorView extends BaseStateView {
	static get DRAG_IDLE() { return 0; }
	static get DRAG_ACTIVE() { return 1; }
	
	constructor( hangarModel ) {
		super();
		this.model = hangarModel;
		
		this.verbose = true;
		
		this.dragState = HangarEditorView.DRAG_IDLE;
		this.dragStartPos = new Vec2D();
		this.dragStartRot = 0;
		this.dragFromInv = false;
		this.dragActionCompleted = false;
		this.dragSnapOffset = new Vec2D();
		this.dragView = null;
		
		this.modalAlert = null;

		this.root = new NodeView();
		this.createShipPanel();
		this.createNavButton();
		this.createInventoryPanel();
		this.createDetailPanel();
		this.createChecklistView();
		this.createThrusterFormulaView();
		
		this.SetListener(EventBus.ui, "partBtnClicked", this.onPartBtnClicked);
		this.SetListener(EventBus.ui, "partBtnClicked", this.onPartBtnClicked);
		this.SetListener(EventBus.ui, "invPanelClicked", this.onInvPanelClicked);
		this.SetListener(EventBus.ui, "shipPartClicked", this.onShipPartClicked);
		this.SetListener(EventBus.ui, "hangarSparePartsUpdated", this.onSparesUpdated);
		this.SetListener(EventBus.ui, "shipUpdated", this.onShipUpdated);
	}
	 
	Destroy() {
		if(this.dragState != HangarEditorView.DRAG_IDLE) {
			this.cancelDragMode();
		}
		
		super.Destroy();
	}

	onInvPanelClicked(e) {
		if(this.dragState == HangarEditorView.DRAG_ACTIVE) {
			if(this.dragFromInv) {
				this.cancelDragMode();
			}else {
				//remove part from ship
				this.completeDragMode_toInv();
			}
			
		}
	}
	
	onShipPartClicked(e) {
		if(e.view == this.dragView) return; //ignore clicking drag'd part
		var shipPartView = e.view;
		if(this.dragState == HangarEditorView.DRAG_ACTIVE) {
			//try to attach dragging part
			if(!shipPartView.isMountable) return;
			var parentRelativePos = new Vec2D(e.x, e.y);
			this.completeDragMode_toShip( shipPartView, parentRelativePos );
		}
		else {
			//if part has no children, begin dragging it
			if(shipPartView.children.length != 0) return;
			this.beginDragMode( shipPartView, false);
		}
	}
	
	onPartBtnClicked(e) {
		var sparePartTypeID = e.partTypeID;
		if(this.dragState == HangarEditorView.DRAG_IDLE) {

			if(!this.model.createDragPartFromSpare(sparePartTypeID)) {
				console.error("trying to use a part, but we have no spares - " + sparePartTypeID);
				return;
			}
			
			var partView = ShipView.CreatePartView(this.model.dragPart);
			this.makeShipPartClickable(partView);
			
			//enter possible drag mode
			this.beginDragMode( partView, true );
		}
	}
	
	onShipUpdated(e) {
		this.model.ship.view.comDotView.pos.setVec( this.model.ship.CoM.pos );
		this.updateChecklistView();
		this.createThrusterFormulaView();
	}

	beginDragMode( partView, fromInv ) {
		if(this.dragState != HangarEditorView.DRAG_IDLE) {
			console.error("entering drag mode, already in drag! ooo girrrl");
			return;
		}
		
		this.dragView = partView;
		this.dragFromInv = fromInv;
		
		this.dragStartRot = partView.rotation;
		this.dragStartPos.setVec( partView.pos );
		
		if(!fromInv && partView.parent) {
			//translate to world rotation
			partView.rotation += partView.parent.worldRotation;
		}
		
		var app = Service.get("app");
		this.dragView.pos.setVec( app.lastMousePos );
		
		this.root.addChild(this.dragView);
		
		this.dragState = HangarEditorView.DRAG_ACTIVE;
		this.dragActionCompleted = true;
	}
	
	cancelDragMode() {
		if(this.dragState != HangarEditorView.DRAG_ACTIVE) {
			console.error("cant cancel drag mode if we're not active");
			return;
		}
		
		if(this.dragFromInv) {
			this.dragView.removeFromParent(true);
			this.dragView = null;
			this.model.clearDragPart();
		}
		else {
			this.dragView.pos.setVec(this.dragStartPos);
			this.dragView.rotation = this.dragStartRot;
		}
		
		this.dragState = HangarEditorView.DRAG_IDLE;
		this.dragActionCompleted = true;
	}
	
	completeDragMode_toInv() {
		if(this.dragState != HangarEditorView.DRAG_ACTIVE || this.dragFromInv) {
			console.error("cant complete completeDragMode_toInv - because of reasons");
			return;
		}
		
		var uid = this.dragView.uid;
		
		//removed a part from the ship, placed into inventory
		this.dragView.removeFromParent(true);
		this.dragView = null;
		this.model.removePartFromShipByUID( uid );
		
		this.dragState = HangarEditorView.DRAG_IDLE;
		this.dragActionCompleted = true;
	}
	
	
	completeDragMode_toShip( attachToPartView, parentRelativePos ) {
		if(this.dragState != HangarEditorView.DRAG_ACTIVE) {
			console.error("cant complete completeDragMode_toShip - because of reasons");
			return;
		}
		
		var partView = this.dragView;

		partView.pos = parentRelativePos;
		
		//snap the position
		var snapSize = 5;
		partView.pos.x = Math.round(partView.pos.x); //round to integer
		partView.pos.y = Math.round(partView.pos.y); //round to integer
		partView.pos.x -= partView.pos.x % snapSize; //snap to grid
		partView.pos.y -= partView.pos.y % snapSize; //snap to grid
		
		partView.rotation -= attachToPartView.worldRotation;
		attachToPartView.addChild( partView );
		this.dragView = null;
		if(this.dragFromInv) {
			//handle dragging from inv to ship
			this.model.attachPartToShipPartByUID( attachToPartView.uid, partView.pos, partView.rotation );
		}else {
			//handle dragging from-ship to-ship (essentially 'move')
			this.model.reattachPartToShipByUID( attachToPartView.uid, partView.pos, partView.rotation, partView.uid );			
		}
		
		if(this.verbose) console.log("part attached to ship at " + partView.pos.toString())
		
		this.dragState = HangarEditorView.DRAG_IDLE;
		this.dragActionCompleted = true;
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
		});
		
		//if ship.view has no parts, clicking on panel will drop first part
		var originalMouseDown = (this.shipPanel.OnMouseDown).bind(this.shipPanel);
		this.shipPanel.OnMouseDown = function(e, x,y) {

			if(self.dragView && (self.model.ship.frame == null || self.dragView.uid == self.model.ship.frame.uid)) {
				//ensure first part is a 'frame' category
				if(self.model.ship.frame == null && !self.model.isDragPartOfCategory("frame")) {
					//TODO: throw alert 'first part must be frame category'
					return;
				}
				//allow droping first part
				self.completeDragMode_toShip( self.model.ship.view, new Vec2D() );
			}else {
				originalMouseDown(e, x,y);
			}
		}
		
		this.shipPanel.addChild(this.model.ship.view);
		this.model.ship.view.pos.setVal(0,0);
		this.rMakeShipViewClickable(this.model.ship.view);
		
		this.root.addChild(this.shipPanel);
	}
	
	rMakeShipViewClickable( view ) {
		this.makeShipPartClickable(view);
		
		for(let c of view.children) {
			this.rMakeShipViewClickable(c);
		}
	}
	makeShipPartClickable( part ) {
		if(part.image) {
			var originalMouseDown = (part.OnMouseDown).bind(part);
			var editorView = this;
			part.OnMouseDown = function(e, x,y) {
				if(editorView.dragActionCompleted) return;
				var origX = x; var origY = y;
				//make local to self origin
				x -= this.pos.x;
				y -= this.pos.y;
				//rotate
				if(this.rotation != 0) {
					var v = new Vec2D(x,y);
					v.rotate(-this.rotation);
					x = v.x;
					y = v.y;
				}
				
				var size = new Vec2D(this.image.width, this.image.height);

				if( Rect2D.isPointInArea(x,y, -size.x/2, -size.y/2, size.x, size.y) ) {
					EventBus.ui.dispatch({evtName:"shipPartClicked", view:part, x:x, y:y });
				}else if( editorView.dragView ) {
					
					//try rect-rect collision (TODO: remember rotations for both parts)
					var partArea = this.getArea();
					var dragArea = editorView.dragView.getArea().addOffset(x,y);
					if(partArea.isRectOverlapped( dragArea )) {
						EventBus.ui.dispatch({evtName:"shipPartClicked", view:part, x:x, y:y });
					}
				}
				originalMouseDown(e, origX,origY);
			}
		}
	}
	
	createNavButton() {
	 	//add button to switch to hangar state
		var RP = Service.get("rp");
		var sprBtnBlue = RP.getSprite("gfx/btn_blue.sprite");
		this.btnLaunch = new ButtonView("navSpace", sprBtnBlue, "LAUNCH", "14px Arial", "#FFFF00");
		this.btnLaunch.pos.setVal(500, 50);
		//this.btnLaunch.rotation = Math.PI/3;
		
		this.SetListener(EventBus.ui, "navSpace", this.gotoSpace);
		this.root.addChild(this.btnLaunch);
		
		var sprBtnDark = RP.getSprite("gfx/btn_dark.sprite");
		this.btnLoadBP = new ButtonView("navBlueprintLoad", sprBtnDark, "Load Blueprint", "14px Arial", "#FFFF00");
		this.btnLoadBP.pos.setVal(650, 50);
		
		this.SetListener(EventBus.ui, "navBlueprintLoad", this.gotoLoadBP);
		this.root.addChild(this.btnLoadBP);
		
		this.btnSaveBP = new ButtonView("navBlueprintSave", sprBtnDark, "Save Blueprint", "14px Arial", "#FFFF00");
		this.btnSaveBP.pos.setVal(650, 95);
		
		this.SetListener(EventBus.ui, "navBlueprintSave", this.gotoSaveBP);
		this.root.addChild(this.btnSaveBP);
		
				
		this.btnClear = new ButtonView("navClear", sprBtnDark, "Clear Parts", "14px Arial", "#FFFF00");
		this.btnClear.pos.setVal(650, 135);
		
		this.SetListener(EventBus.ui, "navClear", this.onClear);
		this.root.addChild(this.btnClear);
	}
	
	createChecklistView() {
		this.checklistTitle = new NodeView();
		this.checklistTitle.setLabel("Launch Requirements", "15px Arial", "#AAAAAA");
		this.checklistTitle.pos.setVal(100,25);
		this.root.addChild(this.checklistTitle);
		
		this.checklistFrame = new NodeView();
		this.checklistFrame.setLabel("Frame: ok", "12px Arial", "#FF0000");
		this.checklistFrame.pos.setVal(100,50);
		
		this.checklistReactor = new NodeView();
		this.checklistReactor.setLabel("Reactor: ok", "12px Arial", "#FF0000");
		this.checklistReactor.pos.setVal(100,75);
		
		this.checklistCockpit = new NodeView();
		this.checklistCockpit.setLabel("Cockpit: ok", "12px Arial", "#FF0000");
		this.checklistCockpit.pos.setVal(100,100);

		this.root.addChild(this.checklistFrame);
		this.root.addChild(this.checklistReactor);
		this.root.addChild(this.checklistCockpit);
		
		this.updateChecklistView();
	}
	updateChecklistView() {
		var frameStatus = this.model.getReqStatus_Frame();
		var reactorStatus = this.model.getReqStatus_Reactor();
		var cockpitStatus = this.model.getReqStatus_Cockpit();
		this.checklistFrame.updateLabel("Frame: " + (frameStatus ? "OK":"FAIL"));
		this.checklistFrame.updateLabelStyle( frameStatus ? "#00EE00" : "#FF0000");
		this.checklistReactor.updateLabel("Reactor: " + (reactorStatus ? "OK":"FAIL"));
		this.checklistReactor.updateLabelStyle( reactorStatus ? "#00EE00" : "#FF0000");
		this.checklistCockpit.updateLabel("Cockpit: " + (cockpitStatus ? "OK":"FAIL"));
		this.checklistCockpit.updateLabelStyle( cockpitStatus ? "#00EE00" : "#FF0000");
	}
	
	onSparesUpdated(e) {
		this.fillInventoryPanel();
	}
	
	createInventoryPanel() {
		var gfx = Service.get("gfx");
		this.invPanel = new NodeView();
		var w = 300;
		var h = gfx.getHeight()-300;
		this.invPanel.setRect(w,h, "#222222");
		this.invPanel.pos.setVal(gfx.getWidth() - w/2,  h/2 );
		
		this.root.addChild(this.invPanel);
		
		var editorView = this;
		var originalMouseDown = (this.invPanel.OnMouseDown).bind(this.invPanel);
		this.invPanel.OnMouseDown = function(e, x,y) {
			if(editorView.dragActionCompleted) return;
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
		
		
		this.fillInventoryPanel();
	}
	
	fillInventoryPanel() {
		//make sure to clear previous list before rebuilding
		this.invPanel.removeAllChildren();
		
		//rebuild list
		var i = 0;
		var padding = 5;
		for(let partTypeID in this.model.userInventory.spareParts) {
			var qty = this.model.userInventory.spareParts[partTypeID];
			if(qty < 1) continue; //ignore zero qty parts
			
			var partListView = new PartListView(partTypeID, qty);
			partListView.pos.y = i * (partListView.size.y + padding);
			
			this.invPanel.addChild(partListView);
			i++;
		}
		
	}
	
	createDetailPanel() {
		var gfx = Service.get("gfx");
		this.detailPanel = new NodeView();
		var w = 300;
		var h = 300;
		this.detailPanel.setRect(300,300, "#999999");
		this.detailPanel.pos.setVal(gfx.getWidth() - w/2, gfx.getHeight() - h/2 );
		var editorView = this;
		var originalMouseDown = (this.invPanel.OnMouseDown).bind(this.invPanel);
		this.detailPanel.OnMouseDown = function(e, x,y) {
			if(editorView.dragActionCompleted) return;
			var originX = this.pos.x;
			var originY = this.pos.y;
			if( Config.areSpritesCentered ) {
				originX -= this.size.x/2;
				originY -= this.size.y/2;
			}
			if( Rect2D.isPointInArea(x,y, originX, originY, this.size.x, this.size.y) ) {
				EventBus.ui.dispatch({evtName:"detailPanelClicked"});
			}
			originalMouseDown(e, x,y);
		}
		
		this.root.addChild(this.detailPanel);
	}
	
	createThrusterFormulaView() {
		if(this.formulaView) {
			this.formulaView.removeFromParent(true);
			this.formulaView = null;
		}
		
		var formulaView = new NodeView();
		var w = 200;
		var h = 400;
		formulaView.setRect(w, h, "#FFFFFF");
		formulaView.pos.setVal(w/2, 400);
	
		var stepY = 15;
		var y = -(h/2) + stepY;
		var i = 1;
		var header = new NodeView();
		header.setLabel("tN f(s)=< Ka*s , Kx*s , Ky*s >", "10px Arial", "#222222");
		header.pos.setVal(0,y); y+= stepY*2;
		formulaView.addChild(header);
		
		var maxAp = {a:0,x:0,y:0}; var maxAn = {a:0,x:0,y:0}; 
		var maxXp = {a:0,x:0,y:0}; var maxXn = {a:0,x:0,y:0};
		var maxYp = {a:0,x:0,y:0}; var maxYn = {a:0,x:0,y:0};
		for(let t of this.model.ship.thrusters) {
			var formula = new NodeView();
			var cache = t.cachedAccelModel;
			var ka = Number(cache.maxAngular.toFixed(3));
			var kx = Number(cache.maxLinear.x.toFixed(3));
			var ky = Number(cache.maxLinear.y.toFixed(3));
			
			if(ka > 0) { maxAp.a += ka; maxAp.x += kx; maxAp.y += ky; }
			if(ka < 0) { maxAn.a += ka; maxAn.x += kx; maxAn.y += ky; }
			if(kx > 0) { maxXp.a += ka; maxXp.x += kx; maxXp.y += ky; }
			if(kx < 0) { maxXn.a += ka; maxXn.x += kx; maxXn.y += ky; }
			if(ky > 0) { maxYp.a += ka; maxYp.x += kx; maxYp.y += ky; }
			if(ky < 0) { maxYn.a += ka; maxYn.x += kx; maxYn.y += ky; }
			
			formula.setLabel("t"+i+" f(s)=< "+ka+"*s , "+kx+"*s , "+ky+"*s >", "10px Arial", "#000000");
			formula.pos.setVal(0,y); y+= stepY;
			formulaView.addChild(formula);
			
			i++;
		}
		
		y+= stepY;//extra space
		
		var maxArr = [["A+", maxAp], ["A-", maxAn],["X+", maxXp], ["X-", maxXn], ["Y+", maxYp], ["Y-", maxYn]];
		for(let max of maxArr) {
			var mView = new NodeView();
			mView.setLabel("max "+max[0]+" =< "+max[1].a.toFixed(3)+" , "+max[1].x.toFixed(3)+" , "+max[1].y.toFixed(3)+" >", "10px Arial", "#222222");
			mView.pos.setVal(0,y); y+= stepY;
			formulaView.addChild(mView);
		}
		
		y+= stepY;//extra space
		var CoM = this.model.ship.CoM;
		var comView = new NodeView();
		comView.setLabel("CoM  "+CoM.pos.x.toFixed(3)+","+CoM.pos.y.toFixed(3)+" : "+CoM.mass.toFixed(3), "10px Arial", "#222222");
		if(CoM.pos.x != 0 && CoM.pos.y != 0) {
			comView.updateLabelStyle("#FF0000")
		}
		comView.pos.setVal(0,y); y+= stepY;
		formulaView.addChild(comView);
		
		this.root.addChild(formulaView);
		this.formulaView = formulaView;
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

	gotoSpace() {
		if(this.model.canLaunch()) {
			EventBus.game.dispatch({evtName:"gotoState", state:GameStateController.STATE_FLYING});
		}else {
			this.createModalAlert("ALERT", "Requirements not met");
		}
	}
	gotoLoadBP() {
		var blueprint = undefined;
		EventBus.game.dispatch({evtName:"gotoState", state:GameStateController.STATE_BLUEPRINT, params:{blueprintToLoad:blueprint}});
	}
	gotoSaveBP() {
		var SaveData = Service.get("sd");
		//show alert to get name
		var fileName = prompt("Enter name for blueprint.", "Blueprint Name");
		if(fileName == null) return; //user cancelled
		//if file name exists; confirm overwrite
		var blueprints = SaveData.load("blueprints");
		if(blueprints[fileName]) {
			var result = confirm("Overwrite blueprint " + fileName + "?");
			if(!result) return; //user cancelled
		}

		//save the blueprint
		this.model.saveBlueprintData(fileName);
	}
	
	onClear(e) {
		if(this.dragState == HangarEditorView.DRAG_ACTIVE) {
			//cancel drag before clearing
			this.cancelDragMode();
		}
		
		this.model.removeAllPartsFromShip();
		
		//remove all children views of frame
		this.model.ship.view.children[0].removeAllChildren(true);
		//this.dragView.removeFromParent(true);
	}
	
	OnMouseDown(e, x,y) {
		if(this.modalAlert) {
			this.dismissModal();
			return;
		}
		
		this.dragActionCompleted = false;
		this.root.OnMouseDown(e,x,y);
		
		if(!this.dragActionCompleted && this.dragView) {
			//attempt to snap part by edge points	
		}
	}
	
	OnKeyDown(e, x,y) {
		switch(e.keyCode) {
			case 'R'.charCodeAt(0):
			if(this.dragView) {
				//rotate drag piece
				this.dragView.rotation += Math.PI/4;
			}else if( this.model.ship.frame.children.length == 0) {
				//rotate the root frame
				this.model.ship.frame.rotation += Math.PI/4;
				this.model.ship.view.children[0].rotation = this.model.ship.frame.rotation;
			}
			break;
			case 'X'.charCodeAt(0):
			if(confirm("DEBUG: reset blueprints?")) {
				EventBus.game.dispatch({evtName:"resetBlueprints"});
			}
			break;
			case 'U'.charCodeAt(0):
				this.dbgRunUnitTest();
			break;
		}
	}

	Draw( g, x,y, ct) {
		//g.drawRectEx(g.getWidth()/2, g.getHeight()/2, g.getWidth(), g.getHeight(), "#000000");

		if(this.dragView) {
			var app = Service.get("app");
			this.dragView.pos.setVec( app.lastMousePos );
		}
		
		this.root.draw(g, x,y)
	}
	
	dbgRunUnitTest() {
		console.log("---unit test start---");
		
	}
}

class PartListView extends NodeView {
	constructor(partTypeID, qty ) {
		super();
		this.partJson = ShipPartCatalog.getPartJson(partTypeID);
		
		this.setRect(250, 50, "#FFFFFF");
		
		var labelText = qty + "x " + this.partJson.name;
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
			EventBus.ui.dispatch({evtName:"partBtnClicked", partTypeID:this.partJson.type});
		}
	}
}