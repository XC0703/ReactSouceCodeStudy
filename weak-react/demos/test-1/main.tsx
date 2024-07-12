/**
 * 调试 react 包
 */
// import React from 'react';

// console.log(React);
// console.log(React.createElement('div', null, 'Hello world!'));

/**
 * 调试 react-dom 包
 */
import React from 'react';
import ReactDOM from 'react-dom/client'; // weak-react\scripts\vite\vite.config.js 中，重定向的应该是'react-dom/client'而不是'react-dom'，方便类型推断

// 1、创建一个 React 组件，从 jsx 语法到 React 元素虚拟DOM，分为两步，第一步是 编译时（babel实现），第二步是运行时（手动实现）。
// const App = () => {
// 	return <div>Hello world!</div>;
// };
// 经过编译转换为下面这行代码：
const App = React.createElement('div', null, 'Hello world!');
// 最终转化为虚拟DOM
console.log('生成的React元素虚拟DOM', App);

// 2、获取 DOM 容器
const container = document.getElementById('root') as HTMLElement; //  HTMLElement | null，需要转换为 HTMLElement

// 3、使用 ReactDOM.createRoot 创建根实例，类似于 Vue 中的 createApp
const root = ReactDOM.createRoot(container);

// 4、使用 root.render 方法渲染组件（虚拟DOM变成真实DOM）,类似于 Vue 中的 mount
root.render(App);
