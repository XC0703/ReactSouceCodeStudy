import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import replace from '@rollup/plugin-replace';
import { resolvePkgPath } from '../rollup/utils';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	// replace 插件用于定义全局变量 __DEV__ 并将其设置为 true，同时 preventAssignment 选项防止了对这个变量的重新赋值。
	plugins: [react(), replace({ __DEV__: true, preventAssignment: true })],
	resolve: {
		// 包路径重定向
		alias: [
			{
				find: 'react',
				replacement: resolvePkgPath('react')
			},
			{
				find: 'react-dom',
				replacement: resolvePkgPath('react-dom')
			},
			{
				find: 'hostConfig',
				replacement: path.resolve(
					resolvePkgPath('react-dom'),
					'./src/hostConfig.ts'
				)
			}
		]
	}
});
