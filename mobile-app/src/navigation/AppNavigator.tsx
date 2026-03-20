import React from "react";
import { Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LoginScreen } from "../screens/Auth/LoginScreen";
import { SignupScreen } from "../screens/Auth/SignupScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { EarningsScreen } from "../screens/EarningsScreen";
import { WalletScreen } from "../screens/WalletScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { DashboardProvider } from "../context/DashboardContext";
import { useAuth } from "../context/AuthContext";

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#F1F5F9",
    card: "#0B1220",
    text: "#FFFFFF",
    border: "rgba(148,163,184,0.2)",
    primary: "#2563EB"
  }
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function tabIcon(name: keyof typeof Ionicons.glyphMap, focused: boolean) {
  return (
    <View
      style={{
        minWidth: 30,
        height: 30,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "rgba(59,130,246,0.24)" : "transparent"
      }}
    >
      <Ionicons
        name={name}
        size={18}
        color={focused ? "#93C5FD" : "#CBD5E1"}
      />
    </View>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#0B1220" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "800" },
        tabBarStyle: {
          backgroundColor: "#020617",
          borderTopColor: "rgba(148,163,184,0.24)",
          height: 66,
          paddingTop: 6,
          paddingBottom: 8
        },
        tabBarActiveTintColor: "#93C5FD",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800"
        },
        tabBarIcon: ({ focused }) => {
          switch (route.name) {
            case "Home":
              return tabIcon("home-outline", focused);
            case "Earnings":
              return tabIcon("cash-outline", focused);
            case "Wallet":
              return tabIcon("wallet-outline", focused);
            case "Profile":
              return tabIcon("person-outline", focused);
            default:
              return tabIcon("ellipse-outline", focused);
          }
        },
        headerTitle: () => (
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900" }}>
            EdisonPay
          </Text>
        )
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session } = useAuth();

  if (!session) return <AuthNavigator />;

  return (
    <DashboardProvider>
      <AppTabs />
    </DashboardProvider>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
