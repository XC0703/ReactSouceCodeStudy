const { defaults } = require('jest-config');

module.exports = {
	...defaults,
	rootDir: process.cwd(),
	// 寻找测试用例忽略的文件夹
	modulePathIgnorePatterns: ['<rootDir>/.history'],
	// 依赖包的解析地址
	moduleDirectories: [
		// React 和 ReactDOM 包的地址
		'dist/node_modules',
		// 第三方依赖的地址
		...defaults.moduleDirectories
	],
	testEnvironment: 'jsdom',
	// 测试文件的匹配规则
	moduleNameMapper: {
		'^scheduler$': '<rootDir>/node_modules/scheduler/unstable_mock.js'
	},
	// 这个对象用于配置Jest的虚拟时钟（fake timers）
	fakeTimers: {
		enableGlobally: true,
		legacyFakeTimers: true
	},
	// 用于指定在测试环境设置之后运行的文件
	setupFilesAfterEnv: ['./scripts/jest/setupJest.js']
};
