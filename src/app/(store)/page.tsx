import { getHomepage } from "@/lib/homepage";
import Intro from "@/components/store/Intro";
import HomeView from "@/components/store/home/HomeView";

export const revalidate = 60; // publishing from the admin also revalidates on demand

export default async function Home() {
  return (
    <>
      <Intro />
      <HomeView sections={await getHomepage()} />
    </>
  );
}
