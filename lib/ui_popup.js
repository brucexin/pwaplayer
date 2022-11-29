class PopupContainer {
    static DOCK_SIDE_TOP = "dock_top";
    DOCK_SIDE_BOTTOM = "dock_bottom";
    ORIENT_UP = "up";
    ORIENT_DOWN = "down";
    REF_TYPE_INSIDE = "ref_inside";
    REF_TYPE_DOCK = "ref_dock";
    
}

class DOCK_TYPE {

}

DOCK_TYPE.LEFT_LEFT = "l-l";
DOCK_TYPE.LEFT_RIGHT = "l-r";
DOCK_TYPE.RIGHT_LEFT = "r-l";
DOCK_TYPE.RIGHT_RIGHT = "r-r";
DOCK_TYPE.TOP_TOP = "t-t";
DOCK_TYPE.TOP_BOTTOM = "t-b";
DOCK_TYPE.BOTTOM_TOP = "b-t";
DOCK_TYPE.BOTTOM_BOTTOM = "b-b";

// function popupAtLL(elP, dRect, x, y) {
//     let left = dRect.left + x;
//     let top = y;
//     elP.style.left = left + 'px';
//     elP.style.top = top + 'px';
// }

function popupAtTT(elP, pRect, dRect, x, y) {
    let left = dRect.x + x;
    let top = dRect.top + y;
    elP.style.left = left + 'px';
    elP.style.width = pRect.width + 'px';
    elP.style.top = top + 'px';
    elP.style.height = pRect.height + 'px';
}

function popupAtTB(elP, pRect, dRect, x, y) {
    let left = dRect.x + x;
    let top = dRect.bottom + y;
    elP.style.left = left + 'px';
    elP.style.width = pRect.width + 'px';
    elP.style.top = top + 'px';
    elP.style.height = pRect.height + 'px';
}

function popupAtBT(elP, pRect, dRect, x, y) {
    let left = dRect.x + x;
    let bottom = dRect.top + y;
    elP.style.left = left + 'px';
    elP.style.width = pRect.width + 'px';
    elP.style.top = bottom - pRect.height + 'px';
    elP.style.height = pRect.height + 'px';
}

function popupAtBB(elP, pRect, dRect, x, y) {
    let left = dRect.x + x;
    let bottom = dRect.bottom + y;
    elP.style.left = left + 'px';
    elP.style.width = pRect.width + 'px';
    elP.style.top = bottom - pRect.height + 'px';
    elP.style.height = pRect.height + 'px';
}

function showPopup(elementPopup, elementDock, dockType, referenceX, referenceY) {
    let elP = elementPopup;
    let elD = elementDock;
 
    let pRect = elP.getBoundingClientRect();
    let dRect = elD.getBoundingClientRect();

    switch(dockType) {
        case DOCK_TYPE.TOP_TOP:
            popupAtTT(elP, pRect, dRect, referenceX, referenceY);
            break;
        case DOCK_TYPE.TOP_BOTTOM:
            popupAtTB(elP, pRect, dRect, referenceX, referenceY);
            break;
        case DOCK_TYPE.BOTTOM_TOP:
            popupAtBT(elP, pRect, dRect, referenceX, referenceY);
            break;
        case DOCK_TYPE.BOTTOM_BOTTOM:
            popupAtBB(elP, pRect, dRect, referenceX, referenceY);
            break;
        default:
            break;
    }

    elementPopup.style.position = 'fixed';
    elementPopup.style.visibility = 'visible';

    
}

function hidePopup(elementPopup) {
    elementPopup.style.position = 'fixed';
    elementPopup.style.visibility = 'hidden';
    // elementPopup.style.left = "";
    // elementPopup.style.width = "";
    // elementPopup.style.top = "";
    // elementPopup.style.height = "";
}

export {
    DOCK_TYPE,
    showPopup,
    hidePopup
}