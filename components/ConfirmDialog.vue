<template>
  <ModalDialog :open="open" @close="$emit('cancel')" title="Confirm">
    <div class="space-y-4">
      <p class="text-gray-600 dark:text-gray-400">{{ message }}</p>
      <div class="flex justify-end gap-2 pt-1">
        <button @click="$emit('cancel')" class="btn-ghost">Cancel</button>
        <button @click="$emit('confirm')" class="btn-danger">{{ confirmLabel }}</button>
      </div>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
}>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>
