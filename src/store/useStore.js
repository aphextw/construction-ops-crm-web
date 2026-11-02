import { create } from "zustand";

export const useDataUserStore = create((set) => ({
  userName: "",
  userEmail: "",
  userRole: {},
  projectToOpen: {},
  expensesToOpen: {},
  projects: [],
  sectionToOpen: {},
  highRights: false,

  setSectionToOpen: (section) => set({ sectionToOpen: section }),
  setProjects: (projects) => set({ projects }),
  setExpensesToOpen: (expenses) => set({ expensesToOpen: expenses }),
  setProjectToOpen: (project) => set({ projectToOpen: project }),
  setUserRole: (userRole) => set({ userRole: userRole }),
  setUserName: (userName) => set({ userName: userName }),
  setUserEmail: (userEmail) => set({ userEmail: userEmail }),
  setHighRights: (highRights) => set({ highRights: highRights }),
  resetSession: () =>
    set({
      userName: "",
      userEmail: "",
      userRole: {},
      projectToOpen: {},
      expensesToOpen: {},
      projects: [],
    }),
}));
