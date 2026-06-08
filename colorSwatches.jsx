(function(thisObj){

var libraries = [{ name: "Default", colors: [] }];
var currentLibraryIndex = 0;
var swatchButtons = [];
var selectedSwatchIndex = -1;

var file = new File(Folder.userData.fsName + "/colorSwatches.json");

function intToRGB(colorInt){
    var r = (colorInt >> 16) & 255;
    var g = (colorInt >> 8) & 255;
    var b = colorInt & 255;
    return [r/255, g/255, b/255];
}

function hexToRGB(hex){
    hex = hex.replace("#","");
    var r = parseInt(hex.substring(0,2),16)/255;
    var g = parseInt(hex.substring(2,4),16)/255;
    var b = parseInt(hex.substring(4,6),16)/255;
    return [r,g,b];
}


function saveLibraries(){
    var data = JSON.stringify(libraries);
    file.open("w");
    file.write(data);
    file.close();
}

function loadLibraries(){
    if (file.exists){
        try {
            file.open("r");
            var content = file.read();
            file.close();
            libraries = JSON.parse(content);
        } catch(e){
            libraries = [{ name: "Default", colors: [] }];
        }
    }
}


function applyColorToSelection(color){

    var comp = app.project.activeItem;

    if (!(comp instanceof CompItem)){
        alert("No active comp");
        return;
    }

    var props = comp.selectedProperties;

    if (props.length === 0){
        alert("Select a color property");
        return;
    }

    app.beginUndoGroup("Apply Color");

    for (var i = 0; i < props.length; i++){
        try {
            props[i].setValue(color);
        } catch(e){}
    }

    app.endUndoGroup();
}


function buildUI(thisObj){

    loadLibraries();

    var panel = (thisObj instanceof Panel)
        ? thisObj
        : new Window("palette","Color Swatches",undefined,{resizeable:true});

    var mainGroup = panel.add("group");
    mainGroup.orientation = "column";

    mainGroup.add("statictext", undefined, "Swatches Library");

    var libraryGroup = mainGroup.add("group");

    var dropdown = libraryGroup.add("dropdownlist", undefined, []);
    var addLibBtn = libraryGroup.add("button", undefined, "+");
    var deleteLibBtn = libraryGroup.add("button",undefined,"-")
    var renameLibBtn = libraryGroup.add("button",undefined,"Rename")

    renameLibBtn.onClick = function(){

    var currentLib = libraries[currentLibraryIndex];

    var newName = prompt(
        "Rename library:",
        currentLib.name
    );

    if (!newName) return;

    newName = newName.replace(/^\s+|\s+$/g, "");
    if (newName === ""){
        alert("Invalid name");
        return;
    }

    currentLib.name = newName;

    refreshDropdown();
    dropdown.selection = currentLibraryIndex;

    saveLibraries();
};

    deleteLibBtn.onClick = function(){

    if (libraries.length <= 1){
        alert("At least one library must exist");
        return;
    }

    if (currentLibraryIndex === 0){
        alert("Default library cannot be deleted");
        return;
    }

    var confirmDelete = confirm(
        "Delete library: " + libraries[currentLibraryIndex].name + " ?"
    );

    if (!confirmDelete) return;


    libraries.splice(currentLibraryIndex, 1);


    currentLibraryIndex = Math.max(0, currentLibraryIndex - 1);

    refreshDropdown();
    selectedSwatchIndex = -1;

    saveLibraries();
    updateSwatches();
};

    function refreshDropdown(){
        dropdown.removeAll();
        for (var i = 0; i < libraries.length; i++){
            dropdown.add("item", libraries[i].name);
        }
        dropdown.selection = currentLibraryIndex;
    }

    refreshDropdown();

    dropdown.onChange = function(){
        currentLibraryIndex = dropdown.selection.index;
        selectedSwatchIndex = -1;
        updateSwatches();
    };

    addLibBtn.onClick = function(){
        var name = prompt("Library name:", "New Library");
        if (!name) return;

        libraries.push({ name:name, colors:[] });
        currentLibraryIndex = libraries.length - 1;

        refreshDropdown();
        updateSwatches();
        saveLibraries();
    };


    var addBtn = mainGroup.add("button", undefined, "Add Color");
    var hexBtn = mainGroup.add("button", undefined, "Add HEX");


    var grid = mainGroup.add("group");
    grid.orientation = "column";

    var row1 = grid.add("group");
    var row2 = grid.add("group");

    function createSwatch(parent, index){

        var btn = parent.add("button", undefined, "");
        btn.preferredSize = [40,40];

        btn.index = index;
        btn.colorData = [0.2,0.2,0.2];

        btn.onDraw = function(){

            var g = this.graphics;

            var brush = g.newBrush(g.BrushType.SOLID_COLOR, this.colorData);
            g.rectPath(0,0,this.size[0],this.size[1]);
            g.fillPath(brush);

            if (selectedSwatchIndex === this.index){
                var pen = g.newPen(g.PenType.SOLID_COLOR,[1,1,1],2);
                g.rectPath(1,1,this.size[0]-2,this.size[1]-2);
                g.strokePath(pen);
            }
        };

        btn.onClick = function(){
            selectedSwatchIndex = this.index;
            updateSwatches();
        };

        btn.onDoubleClick = function(){

            if (selectedSwatchIndex === -1) return;

            var color = libraries[currentLibraryIndex].colors[selectedSwatchIndex];
            if (!color) return;

            applyColorToSelection(color);
        };

        // RIGHT CLICK → DELETE
        btn.addEventListener("mousedown", function(e){

            if (e.button === 2){

                var colors = libraries[currentLibraryIndex].colors;

                if (this.index < colors.length){

                    colors.splice(this.index,1);

                    selectedSwatchIndex = -1;

                    saveLibraries();
                    updateSwatches();
                }
            }
        });

        swatchButtons.push(btn);
    }

    for (var i=0;i<4;i++) createSwatch(row1,i);
    for (var j=0;j<4;j++) createSwatch(row2,j+4);


    // EVENTS


    addBtn.onClick = function(){

        var colors = libraries[currentLibraryIndex].colors;

        if (colors.length >= 8){
            alert("Max 8 colors");
            return;
        }

        var picked = $.colorPicker();
        if (picked == -1) return;

        colors.push(intToRGB(picked));

        saveLibraries();
        updateSwatches();
    };

    hexBtn.onClick = function(){

        var hex = prompt("Enter HEX:", "#FF0000");
        if (!hex) return;

        var colors = libraries[currentLibraryIndex].colors;

        if (colors.length >= 8){
            alert("Max 8 colors");
            return;
        }

        colors.push(hexToRGB(hex));

        saveLibraries();
        updateSwatches();
    };

    // UPDATE


    function updateSwatches(){

    var colors = libraries[currentLibraryIndex].colors;

    for (var i=0;i<swatchButtons.length;i++){

        var btn = swatchButtons[i];

        btn.colorData = colors[i] || [0.2,0.2,0.2];
        try {
            btn.notify("onDraw");
        } catch(e){}
    }
}
    updateSwatches();

    panel.layout.layout(true);

    return panel;
}

// INIT

var myPanel = buildUI(thisObj);

if (myPanel instanceof Window){
    myPanel.center();
    myPanel.show();
}

})(this);