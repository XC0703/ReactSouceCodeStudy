const supportSymbol = typeof Symbol === 'function' && Symbol.for;

// 表示普通的 React 元素，即通过 JSX 创建的组件或 DOM 元素
export const REACT_ELEMENT_TYPE = supportSymbol
	? Symbol.for('react.element')
	: 0xeac7;
