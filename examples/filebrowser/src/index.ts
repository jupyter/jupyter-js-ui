/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  ContentsManager, NotebookSessionManager,
  IKernelSpecIds
} from 'jupyter-js-services';

import {
  FileBrowserWidget, FileBrowserModel
} from 'jupyter-js-ui/lib/filebrowser';

import {
  DocumentManager, DocumentWidget, DocumentRegistry
} from 'jupyter-js-ui/lib/docmanager';

import {
  TextModelFactory
} from 'jupyter-js-ui/lib/docmanager/default';

import {
  EditorWidgetFactory
} from 'jupyter-js-ui/lib/docmanager/editor';


import {
  showDialog, okButton
} from 'jupyter-js-ui/lib/dialog';

import {
  DockPanel
} from 'phosphor-dockpanel';

import {
  KeymapManager
} from 'phosphor-keymap';

import {
  Menu, MenuItem
} from 'phosphor-menus';

import {
  SplitPanel
} from 'phosphor-splitpanel';

import 'jupyter-js-ui/lib/index.css';
import 'jupyter-js-ui/lib/theme.css';


function main(): void {
  let sessionsManager = new NotebookSessionManager();
  sessionsManager.getSpecs().then(specs => {
    createApp(sessionsManager, specs);
  });
}


function createApp(sessionsManager: NotebookSessionManager, specs: IKernelSpecIds): void {
  let contentsManager = new ContentsManager();
  let widgets: DocumentWidget[] = [];
  let activeWidget: DocumentWidget;

  let opener = {
    open: (widget: DocumentWidget) => {
      if (widgets.indexOf(widget) === -1) {
        dock.insertTabAfter(widget);
        widgets.push(widget);
      }
      dock.selectWidget(widget);
      activeWidget = widget;
      widget.disposed.connect((w: DocumentWidget) => {
        let index = widgets.indexOf(w);
        widgets.splice(index, 1);
      });
    }
  };

  let docRegistry = new DocumentRegistry();
  let docManager = new DocumentManager(
    docRegistry, contentsManager, sessionsManager, specs, opener
  );
  let mFactory = new TextModelFactory();
  let wFactory = new EditorWidgetFactory();
  docRegistry.registerModelFactory(mFactory);
  docRegistry.registerWidgetFactory(wFactory, {
    displayName: 'Editor',
    modelName: 'text',
    fileExtensions: ['.*'],
    defaultFor: ['.*'],
    preferKernel: false,
    canStartKernel: true
  });

  let fbModel = new FileBrowserModel(contentsManager, sessionsManager, specs);
  let fbWidget = new FileBrowserWidget(fbModel, docManager, opener);

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.addChild(fbWidget);
  SplitPanel.setStretch(fbWidget, 0);
  let dock = new DockPanel();
  panel.addChild(dock);
  SplitPanel.setStretch(dock, 1);
  dock.spacing = 8;

  document.addEventListener('focus', event => {
    for (let i = 0; i < widgets.length; i++) {
      let widget = widgets[i];
      if (widget.node.contains(event.target as HTMLElement)) {
        activeWidget = widget;
        break;
      }
    }
  });

  let keymapManager = new KeymapManager();
  keymapManager.add([{
    sequence: ['Enter'],
    selector: '.jp-DirListing',
    handler: () => {
      fbWidget.open();
    }
  }, {
    sequence: ['Ctrl N'], // Add emacs keybinding for select next.
    selector: '.jp-DirListing',
    handler: () => {
      fbWidget.selectNext();
    }
  }, {
    sequence: ['Ctrl P'], // Add emacs keybinding for select previous.
    selector: '.jp-DirListing',
    handler: () => {
      fbWidget.selectPrevious();
    }
  }, {
    sequence: ['Accel S'],
    selector: '.jp-CodeMirrorWidget',
    handler: () => {
      activeWidget.context.save();
    }
  }]);

  window.addEventListener('keydown', (event) => {
    keymapManager.processKeydownEvent(event);
  });

  let contextMenu = new Menu([
    new MenuItem({
      text: '&Open',
      icon: 'fa fa-folder-open-o',
      shortcut: 'Ctrl+O',
      handler: () => { fbWidget.open(); }
    }),
    new MenuItem({
      text: '&Rename',
      icon: 'fa fa-edit',
      shortcut: 'Ctrl+R',
      handler: () => { fbWidget.rename(); }
    }),
    new MenuItem({
      text: '&Delete',
      icon: 'fa fa-remove',
      shortcut: 'Ctrl+D',
      handler: () => { fbWidget.delete(); }
    }),
    new MenuItem({
      text: 'Duplicate',
      icon: 'fa fa-copy',
      handler: () => { fbWidget.duplicate(); }
    }),
    new MenuItem({
      text: 'Cut',
      icon: 'fa fa-cut',
      shortcut: 'Ctrl+X',
      handler: () => { fbWidget.cut(); }
    }),
    new MenuItem({
      text: '&Copy',
      icon: 'fa fa-copy',
      shortcut: 'Ctrl+C',
      handler: () => { fbWidget.copy(); }
    }),
    new MenuItem({
      text: '&Paste',
      icon: 'fa fa-paste',
      shortcut: 'Ctrl+V',
      handler: () => { fbWidget.paste(); }
    }),
    new MenuItem({
      text: 'Download',
      icon: 'fa fa-download',
      handler: () => { fbWidget.download(); }
    }),
    new MenuItem({
      text: 'Shutdown Kernel',
      icon: 'fa fa-stop-circle-o',
      handler: () => { fbWidget.shutdownKernels(); }
    }),
    new MenuItem({
      text: 'Dialog Demo',
      handler: () => { dialogDemo(); }
    }),
    new MenuItem({
      text: 'Info Demo',
      handler: () => {
        let msg = 'The quick brown fox jumped over the lazy dog'
        showDialog({
          title: 'Cool Title',
          body: msg,
          buttons: [okButton]
        });
      }
    })
  ]);

  // Add a context menu to the dir listing.
  let node = fbWidget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    let x = event.clientX;
    let y = event.clientY;
    contextMenu.popup(x, y);
  });

  panel.attach(document.body);

  window.onresize = () => panel.update();
}


/**
 * Create a non-functional dialog demo.
 */
function dialogDemo(): void {
  let body = document.createElement('div');
  let input = document.createElement('input');
  input.value = 'Untitled.ipynb'
  let selector = document.createElement('select');
  let option0 = document.createElement('option');
  option0.value = 'python';
  option0.text = 'Python 3';
  selector.appendChild(option0);
  let option1 = document.createElement('option');
  option1.value = 'julia';
  option1.text = 'Julia';
  selector.appendChild(option1);
  body.appendChild(input);
  body.appendChild(selector);
  showDialog({
    title: 'Create new notebook',
    body,
  });
}


window.onload = main;
