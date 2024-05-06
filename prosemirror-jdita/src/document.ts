import { JDita } from "jdita";
import { IS_MARK, defaultNodeName } from "./schema";

/**
 * Removes undefined attributes from an object
 *
 * @param object  - Generic object
 * @returns object - The object with undefined attributes removed
 */
export function deleteUndefined(object?: any) {
  if (object) {
    for (const key in object) {
      if (typeof object[key] === 'undefined') {
        delete(object[key]);
      }
    }
  }
  return object;
}

/**
 * A map of special nodes that need to be handled differently.
 * Instead of using the defaultTravel function, we use the special node function
 * The following 4 nodes (audio, video, image, text) are
 * treated in a customized way instead of applying the defaultTravel() function:
 */
export const NODES: Record<string, (value: JDita, parent: JDita) => any> = {
  audio: (value) => {
    const attrs: any = deleteUndefined({ ...value.attributes });
    const content: JDita[] = [];
    if (value.children) {
      value.children.forEach(child => {
        if (child.nodeName === 'media-autoplay') {
          attrs.autoplay = 'autoplay';
          return;
        }
        if (child.nodeName === 'media-controls') {
          attrs.controls = 'controls';
          return;
        }
        if (child.nodeName === 'media-loop') {
          attrs.loop = 'loop';
          return;
        }
        if (child.nodeName === 'media-muted') {
          attrs.muted = 'muted';
          return;
        }
        if (['desc', 'media-track', 'media-source'].indexOf(child.nodeName) > -1) {
          content.push(child);
          return;
        }
      });
    }
    const result = { type: value.nodeName, attrs, content: content.map(child => travel(child, value)) };

    if (attrs && Object.keys(attrs).length) {
      result.attrs = attrs;
    }
    return result;
  },
  video: (value) => {
    const attrs: any = deleteUndefined({ ...value.attributes });
    const content: JDita[] = [];
    if (value.children) {
      value.children.forEach(child => {
        if (child.nodeName === 'media-autoplay') {
          attrs.autoplay = 'autoplay';
          return;
        }
        if (child.nodeName === 'media-controls') {
          attrs.controls = 'controls';
          return;
        }
        if (child.nodeName === 'media-loop') {
          attrs.loop = 'loop';
          return;
        }
        if (child.nodeName === 'media-muted') {
          attrs.muted = 'muted';
          return;
        }
        if (child.nodeName === 'video-poster') {
          attrs.poster = child.attributes?.value;
          return;
        }
        if (['desc', 'media-track', 'media-source'].indexOf(child.nodeName) > -1) {
          content.push(child);
          return;
        }
      });
    }
    const result = { type: value.nodeName, attrs, content: content.map(child => travel(child, value)) };
    return result;
  },
  image: (value) => {
    if (value.children
      && value.children[0].nodeName === 'alt'
      && value.children[0]?.children
      && value.children[0].children[0].nodeName == 'text'
      ) {
      const attrs = deleteUndefined({ ...value.attributes, alt: value.children[0].children[0].content });
      const result = { type: 'image', attrs };
      return result;
    }
    return defaultTravel(value);
  },
  text: (value: JDita) => ({ type: 'text', text: value.content, attrs: {} }),
};

/**
 * Transforms the JDita document into a proper ProseMirror document
 *
 * @param value - The JDita node
 * @returns The transformed JDita node
 */
export function defaultTravel(value: JDita): any {
  // children will become content
  const content = value.children?.map(child => travel(child, value));
  // attributes will become attrs
  const attrs =  value.attributes || {};
  // remove undefined attributes
  deleteUndefined(attrs);
  // node name will become type
  const type = defaultNodeName(value.nodeName);
  let result: any;
  // IS_MARK is the array  `u, s, b, sup, sub`
  if (IS_MARK.indexOf(value.nodeName) > -1) {
    if (content?.length === 1) {
      result = content[0];
      result.marks = [{ type }]
    }
  } else {
    result = {
      type,
      attrs,
    };

    if (content) {
      result.content = content;
    }
  }
  return result;
}

/**
 * Traverses the JDita document and generates a ProseMirror document
 *
 * @param value - The JDita node
 * @param parent - The parent JDita node
 * @returns The transformed JDita node
 */
export function travel(value: JDita, parent: JDita): any {
  // if it's a special node, use the special node function,
  // otherwise use the default travel function
  const result = (NODES[value.nodeName] || defaultTravel)(value, parent);
  // if the node is not a document and has attributes, set the parent attribute
  if (value.nodeName !== 'doc' && result.attrs) {
    result.attrs.parent = parent.nodeName;
  }
  return result;
}

/**
 * Transforms the JDita document
 * into a Schema compliant JDita document
 *
 * @param jdita - the JDita document
 * @returns transformed JDita document
 */
export function document(jdita: JDita): Record<string, any> {
  /**
   * Example input:
  {
    "nodeName": "document",
    "children": [
      {
        "nodeName": "topic",
        "attributes": {
          "id": "intro-product"
        },
        "children": [
          {
            "nodeName": "title",
            "attributes": {},
            "children": [
              {
                "nodeName": "text",
                "content": "Overview"
              }
            ]
          }
        ]
      }
    ]
  }
  */

  /**
   * Example output of the transformation `travel(jdita, jdita)`:
  {
    "type": "doc",
    "attrs": {},
    "content": [
      {
        "type": "topic",
        "attrs": {
          "id": "intro-product",
          "parent": "doc"
        },
        "content": [
          {
            "type": "title",
            "attrs": {
              "parent": "topic"
            },
            "content": [
              {
                "type": "text",
                "text": "Overview",
                "attrs": {
                  "parent": "title"
                }
              }
            ]
          }
        ]
      }
    ]
  }
  */

  if (jdita.nodeName === 'document') {
    jdita.nodeName = 'doc';
    /*
    Parameter `jdita` is representing the root of JDita document.
    We pass in the root node as the first parameter, and since it's the root node,
    it's also the parent node, which is passed as the second parameter.
    This will return the output of the transformation.
    */
    return travel(jdita, jdita);
  }
  throw new Error('jdita must be a document');
}

/**
 * Replace underscores with hyphens in node names
 *
 * @param type - The string to be modified
 * @returns The sanitized node name with hyphens
 */
function getJditaNodeName(type: string): string {
  return type.replace(/_/g, '-');
}

 /**
 * Recursively traverse through all items in the Prosemirror DOM
 * and create a JDITA object
 *
 * @param prosemirrorDocument - The Prosemirror DOM object
 * @returns The JDITA object
 */
export function unTravel(prosemirrorDocument: Record<string, any>): JDita{

  // Prosemirror content will become JDITA children
  const children = prosemirrorDocument.content?.map(unTravel);

  // attrs will become attributes
  const attributes = prosemirrorDocument.attrs || {};

  // handle the attributes
  for (const key in attributes) {
    if (!attributes[key]) {
      delete attributes[key];
    }
  }
/**
 * TODO: If attribute === 'alt' in image node, then create the alt attribute as a new child node to the attribute node
 * EG like so:
 * "children": [
    {
      "nodeName": "alt",
      "attributes": {},
      "children": [
        {
          "nodeName": "text",
          "content": "The Alt Text"
        }
      ]
    }
  ]
 */

/**
 * TODO: If attribute === 'controls' in audio node, then do not pass it through as an attribute of node 'audio'
 * and create a new node 'media-controls' instead
 *
 * EG:
 * {
      "nodeName": "media-controls",
      "attributes": {
        "name": "controls",
        "value": "true"
      }
    }
 */

/**
 * TODO: If attributes 'controls' and 'source' in 'video' node, then do not pass them as attributes of node 'video'
 * and create child nodes 'media-controls' and 'video-poster' instead
 * EG:
 * {
      "nodeName": "video-poster",
      "attributes": {
        "value": "source.jpg"
    }
    },
      "nodeName": "media-controls",
      "attributes": {
        "name": "controls",
        "value": "true"
    }
 */
  // get the node name
  const nodeName = getJditaNodeName(prosemirrorDocument.type);
  if(nodeName === 'text') {
    return {
      nodeName,
      'content': prosemirrorDocument.text
    }
  }

  const nodeObject: JDita = {
    nodeName,
    attributes,
    children
  }

  return nodeObject;
}

export function reverseTravel(prosemirrorDocument: Record<string, any>): JDita{
  const result = (MEDIA_NODES[prosemirrorDocument.nodeName] || revertToJdita)(prosemirrorDocument.nodeName);
  return result;
}

export const MEDIA_NODES: Record<string, (value: JDita) => any> = {
  video: (value) => {
    console.log('MEDIA_NODES video', value);
    return revertToJdita(value);
  },
  audio: (value) => {
    console.log('MEDIA_NODES audio', value);
    return revertToJdita(value);
  },
  image: (value) => {
    console.log('MEDIA_NODES image', value);
    return revertToJdita(value);
  },
}

export function revertToJdita(prosemirrorDocument: Record<string, any>): JDita {
  // Prosemirror content will become JDITA children
  const children = prosemirrorDocument.content?.map(reverseTravel);

  // attrs will become attributes
  const attributes = prosemirrorDocument.attrs || {};
  // handle the attributes
  for (const key in attributes) {
    if (!attributes[key]) {
      delete attributes[key];
    }
  }

  // get the node name
  const nodeName = getJditaNodeName(prosemirrorDocument.type);
  if(nodeName === 'text') {
    return {
      nodeName,
      'content': prosemirrorDocument.text
    }
  }

  const nodeObject: JDita = {
    nodeName,
    attributes,
    children
  }

  return nodeObject;
}

