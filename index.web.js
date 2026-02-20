/**
 * Web entry point for React Native Web
 */
import 'react-native-url-polyfill/auto';
import { AppRegistry, View, Text } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Error boundary for the root app
const RootContainer = () => {
    try {
        return <App />;
    } catch (e) {
        console.error('Root Rendering Error:', e);
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 20, color: 'red', marginBottom: 10 }}>Application Error</Text>
                <Text>{e.message}</Text>
            </View>
        );
    }
};

AppRegistry.registerComponent(appName, () => RootContainer);

AppRegistry.runApplication(appName, {
    rootTag: document.getElementById('app-root'),
});
