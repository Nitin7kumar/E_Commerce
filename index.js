/**
 * @format
 */

// URL polyfill must be imported before any Supabase code
// Fixes: "Cannot assign to property 'protocol' which has only a getter"
import 'react-native-url-polyfill/auto';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
