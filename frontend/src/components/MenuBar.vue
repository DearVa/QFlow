<template>
  <header class="border-b border-border/60 bg-background/80 text-[11px] uppercase tracking-[0.35em] backdrop-blur">
    <div class="flex items-center gap-6 px-4 py-2">
      <div class="flex items-center gap-2 text-sm font-semibold tracking-[0.4em]">
        <PanelsTopLeft class="size-4 text-primary" />
        <span>QFlow Studio</span>
      </div>
      <Menubar class="border-none bg-transparent p-0 text-[11px] uppercase tracking-[0.3em]">
        <MenubarMenu>
          <MenubarTrigger class="px-2 py-1 text-muted-foreground hover:text-foreground">File</MenubarTrigger>
          <MenubarContent class="min-w-[220px] text-[12px] normal-case tracking-normal">
            <MenubarItem class="text-sm" @select="$emit('reset-layout')">
              New Workspace
              <MenubarShortcut>⇧⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem class="text-sm">Settings</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger class="px-2 py-1 text-muted-foreground hover:text-foreground">Run</MenubarTrigger>
          <MenubarContent class="min-w-[200px] text-[12px] normal-case tracking-normal">
            <MenubarItem class="text-sm">Compile strategy</MenubarItem>
            <MenubarItem class="text-sm">Execute backtest</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger class="px-2 py-1 text-muted-foreground hover:text-foreground">View</MenubarTrigger>
          <MenubarContent class="min-w-[260px] text-[12px] normal-case tracking-normal">
            <MenubarLabel class="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Panels</MenubarLabel>
            <MenubarSeparator />
            <MenubarCheckboxItem
              v-for="panel in props.panels"
              :key="panel.id"
              :checked="panel.active"
              class="text-xs"
              @update:checked="$emit('toggle-panel', panel.id, $event as boolean)"
            >
              <div class="flex flex-col gap-0.5">
                <span class="font-medium text-foreground">{{ panel.label }}</span>
                <span class="text-[10px] text-muted-foreground">{{ panel.description }}</span>
              </div>
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem class="text-xs" @select="$emit('reset-layout')">Reset layout</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <div class="ml-auto flex items-center gap-3 text-[10px] tracking-[0.4em] text-muted-foreground">
        <div class="flex items-center gap-2 rounded-full border border-border/50 px-3 py-1 text-xs font-semibold tracking-[0.3em]">
          <ActivitySquare class="size-3" />
          Live sync
        </div>
        <div class="hidden items-center gap-2 rounded-full border border-border/50 px-3 py-1 text-xs tracking-[0.3em] sm:flex">
          <MonitorCog class="size-3" />
          Experimental build
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger
} from '@/components/ui/menubar';
import { ActivitySquare, MonitorCog, PanelsTopLeft } from 'lucide-vue-next';

interface MenuPanel {
  id: string;
  label: string;
  active: boolean;
  description?: string;
}

const props = defineProps<{ panels: MenuPanel[] }>();

defineEmits<{
  (event: 'toggle-panel', id: string, value: boolean): void;
  (event: 'reset-layout'): void;
}>();
</script>
