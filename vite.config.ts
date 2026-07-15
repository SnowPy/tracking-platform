import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'charts-vendor',
              test: /node_modules[\\/](?:@ant-design[\\/]charts|@antv)[\\/]/,
              priority: 40,
            },
            {
              name: 'react-vendor',
              test: /node_modules[\\/](?:react|react-dom|react-router|react-router-dom|scheduler|use-sync-external-store|zustand)[\\/]/,
              priority: 35,
            },
            {
              name: 'antd-form',
              test: /node_modules[\\/]antd[\\/]es[\\/]form[\\/]/,
              priority: 35,
            },
            {
              name: 'antd-inputs',
              test: /node_modules[\\/]antd[\\/]es[\\/](?:input|input-number|select|tree-select|radio|switch|color-picker|checkbox|date-picker|time-picker)[\\/]/,
              priority: 34,
            },
            {
              name: 'antd-data',
              test: /node_modules[\\/]antd[\\/]es[\\/](?:table|card|collapse|descriptions|statistic|tabs|tag|typography|empty|result|list|tree|segmented|badge|avatar|progress|timeline)[\\/]/,
              priority: 33,
            },
            {
              name: 'antd-feedback',
              test: /node_modules[\\/]antd[\\/]es[\\/](?:alert|modal|message|notification|drawer|tooltip|popconfirm|dropdown|popover|spin|skeleton)[\\/]/,
              priority: 32,
            },
            {
              name: 'antd-layout',
              test: /node_modules[\\/]antd[\\/]es[\\/](?:layout|menu|button|space|grid|divider|breadcrumb|pagination|steps|flex)[\\/]/,
              priority: 31,
            },
            {
              name: 'antd-core',
              test: /node_modules[\\/]antd[\\/]/,
              priority: 30,
            },
            {
              name: 'ant-design-vendor',
              test: /node_modules[\\/]@ant-design[\\/]/,
              priority: 25,
            },
            {
              name: 'rc-vendor',
              test: /node_modules[\\/](?:rc-|@rc-component[\\/])/,
              priority: 20,
            },
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 20,
            },
            {
              name: 'dnd-vendor',
              test: /node_modules[\\/]@dnd-kit[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
})
