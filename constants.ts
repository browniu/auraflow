import React from "react";
import { Module } from "./types";

export const ICONS = {
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props
    }, React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" }))
  ),
  Play: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props
    }, React.createElement("polygon", { points: "5 3 19 12 5 21 5 3" }))
  ),
  Settings: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props
    }, React.createElement("circle", { cx: "12", cy: "12", r: "3" }), React.createElement("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" }))
  ),
  Sparkles: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props
    }, React.createElement("path", { d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" }))
  ),
  ArrowLeft: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props
    }, React.createElement("line", { x1: "19", y1: "12", x2: "5", y2: "12" }), React.createElement("polyline", { points: "12 19 5 12 12 5" }))
  ),
  Trash: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props
    }, React.createElement("polyline", { points: "3 6 5 6 21 6" }), React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }))
  ),
  Save: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props
    }, React.createElement("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }), React.createElement("polyline", { points: "17 21 17 13 7 13 7 21" }), React.createElement("polyline", { points: "7 3 7 8 15 8" }))
  ),
  Edit: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props
    }, React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" }))
  ),
  Input: (props: React.SVGProps<SVGSVGElement>) => (
      React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        ...props
      }, React.createElement("rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }), React.createElement("line", { x1: "9", y1: "12", x2: "15", y2: "12" }))
    )
};

export const MODULE_COLORS = [
  '#C5A059', // Brand Gold
  '#4A90E2', // Blue
  '#50E3C2', // Teal
  '#E05757', // Red
  '#F5A623', // Orange
  '#B8E986', // Lime
  '#BD10E0', // Purple
  '#9013FE', // Violet
];

export const getColorForString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % MODULE_COLORS.length);
  return MODULE_COLORS[index];
};

export const DEFAULT_MODULES: Module[] = [
  {
    id: 'mod_start',
    name: '启动触发器',
    description: '工作流的初始输入参数定义',
    targetUrl: '',
    selectors: { input: '', submit: '', result: '' },
    promptTemplate: '',
    type: 'trigger',
    color: '#333333'
  },
  {
    id: 'mod_1',
    name: 'ChatGPT 总结助手',
    description: '使用 ChatGPT Web 版进行文本总结',
    targetUrl: 'https://chat.openai.com',
    selectors: {
      input: '#prompt-textarea',
      submit: 'button[data-testid="send-button"]',
      result: '.markdown'
    },
    promptTemplate: '请总结以下内容，列出3个要点：\n\n{{input}}',
    type: 'app',
    color: '#74AA9C'
  },
  {
    id: 'mod_2',
    name: 'Gemini 翻译官',
    description: '使用 Google Gemini 进行西班牙语翻译',
    targetUrl: 'https://gemini.google.com/app',
    selectors: {
      input: 'div[contenteditable="true"]',
      submit: '.send-button',
      result: 'model-response'
    },
    promptTemplate: 'Translate this to Spanish:\n\n{{input}}',
    type: 'app',
    color: '#4A90E2'
  }
];